import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { setGlobalOptions } from 'firebase-functions/options';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { findFairDriver, findNearestCompanies } from './dispatch.js';

setGlobalOptions({ region: 'us-west2' });

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * Triggered when a new request document is created.
 * Routes the request to the nearest affiliated tow yard, then assigns
 * to the fairest available driver within that company.
 * Tries every company in range in nearest-first order before giving up.
 */
export const matchDriverOnRequestCreate = onDocumentCreated(
	'requests/{requestId}',
	async (event) => {
		const requestId = event.params.requestId;
		const requestData = event.data?.data();

		if (!requestData) {
			logger.error(`No data for request ${requestId}`);
			return;
		}

		logger.info(`New request created: ${requestId}`);

		if (requestData.status !== 'searching') {
			logger.info(`Request ${requestId} is not searching, skipping`);
			return;
		}

		const todayStr = new Date().toISOString().split('T')[0]; // UTC 'YYYY-MM-DD'
		const companies = await findNearestCompanies(db, requestData.location, 100); // 100km outer search radius

		if (companies.length === 0) {
			logger.warn(`No companies in range for request ${requestId}`);
			await db.collection('requests').doc(requestId).update({ status: 'no_drivers' });
			return;
		}

		for (const company of companies) {
			const driver = await findFairDriver(
				db,
				requestData.location,
				company.companyId,
				requestData.notifiedDriverIds ?? [],
				todayStr,
			);

			if (!driver) continue; // No available drivers in this company, try next

			// Claim the request for this driver using a transaction
			try {
				await db.runTransaction(async (transaction) => {
					const requestRef = db.collection('requests').doc(requestId);
					const requestDoc = await transaction.get(requestRef);
					const data = requestDoc.data();

					if (!data || data.status !== 'searching') {
						throw new Error(`Request ${requestId} is already ${data?.status}`);
					}

					transaction.update(requestRef, {
						status: 'claimed',
						claimedByDriverId: driver.driverId,
						matchedCompanyId: company.companyId,
						claimExpiresAt: admin.firestore.Timestamp.fromDate(
							new Date(Date.now() + 30 * 1000), // 30 second claim timeout
						),
						notifiedDriverIds: admin.firestore.FieldValue.arrayUnion(driver.driverId),
					});
				});

				// Update driver's fairness tracking (non-transactional — slight advantage on failure is acceptable)
				await db.collection('drivers').doc(driver.driverId).update({
					lastAssignedAt: admin.firestore.Timestamp.now(),
					assignmentDate: todayStr,
				});

				logger.info(`Claimed request ${requestId} for driver ${driver.driverId} from company ${company.companyId}`);
				return; // Success — stop iterating companies
			} catch (error) {
				logger.error(`Failed to claim request ${requestId} for driver ${driver.driverId}:`, error);
				// Transaction failed (e.g., request already claimed by concurrent process) — stop
				return;
			}
		}

		// All companies exhausted — no available drivers anywhere in range
		logger.warn(`All companies exhausted for request ${requestId}`);
		await db.collection('requests').doc(requestId).update({ status: 'no_drivers' });
	},
);

/**
 * Scheduled function: runs every 1 minute.
 * Handles expired claims (driver ignored) and declined requests (driver declined client-side).
 * Re-assigns within the matched company first, then advances to next nearest company.
 * Sets status to 'no_drivers' when all companies are exhausted.
 */
export const handleClaimTimeouts = onSchedule(
	{
		schedule: 'every 1 minutes',
		timeZone: 'America/Los_Angeles',
	},
	async () => {
		logger.info('Checking for expired claims...');

		const now = admin.firestore.Timestamp.now();

		// Find requests with expired claims
		const expiredClaimsSnapshot = await db
			.collection('requests')
			.where('status', '==', 'claimed')
			.where('claimExpiresAt', '<=', now)
			.get();

		// Also find requests that were declined (status reset to 'searching' by client)
		const searchingSnapshot = await db
			.collection('requests')
			.where('status', '==', 'searching')
			.where('notifiedDriverIds', '!=', null)
			.get();

		// Filter searching requests: only those with non-empty notifiedDriverIds (i.e., previously claimed)
		const declinedDocs = searchingSnapshot.docs.filter((doc) => {
			const data = doc.data();
			return data.notifiedDriverIds && data.notifiedDriverIds.length > 0;
		});

		// Retry no_drivers requests that haven't expired yet — a driver may have come online
		const noDriversSnapshot = await db
			.collection('requests')
			.where('status', '==', 'no_drivers')
			.where('expiresAt', '>', now)
			.get();

		const allDocs = [...expiredClaimsSnapshot.docs, ...declinedDocs, ...noDriversSnapshot.docs];

		if (allDocs.length === 0) {
			logger.info('No expired, declined, or retryable claims found');
			return;
		}

		logger.info(`Found ${allDocs.length} claims to process (${expiredClaimsSnapshot.size} expired, ${declinedDocs.length} declined, ${noDriversSnapshot.size} no_drivers retry)`);

		const todayStr = new Date().toISOString().split('T')[0];

		const promises = allDocs.map(async (docSnap) => {
			const requestId = docSnap.id;
			const requestData = docSnap.data();

			logger.info(`Processing request ${requestId} (status: ${requestData.status})`);

			try {
				// If the request was no_drivers, reset for a fresh retry — a driver may have come online
				// Keep notifiedDriverIds so we don't re-assign to drivers who already declined
				if (requestData.status === 'no_drivers') {
					await db.collection('requests').doc(requestId).update({
						status: 'searching',
						triedCompanyIds: [],
						matchedCompanyId: null,
						claimedByDriverId: null,
					});
					logger.info(`Reset no_drivers request ${requestId} for retry (keeping ${(requestData.notifiedDriverIds ?? []).length} excluded drivers)`);
					// Fall through to the re-matching logic below
				}

				// If the request is still 'claimed' (expired), reset it to 'searching' first
				if (requestData.status === 'claimed') {
					await db.runTransaction(async (transaction) => {
						const requestRef = db.collection('requests').doc(requestId);
						const requestDoc = await transaction.get(requestRef);
						const data = requestDoc.data();

						if (!data || data.status !== 'claimed') return;

						transaction.update(requestRef, {
							status: 'searching',
							claimedByDriverId: null,
							claimExpiresAt: null,
						});
					});
					logger.info(`Reset expired claim for request ${requestId} to searching`);
				}

				// Re-read request to get latest state after potential reset
				const freshDoc = await db.collection('requests').doc(requestId).get();
				const freshData = freshDoc.data();
				if (!freshData || freshData.status !== 'searching') return;

				const matchedCompanyId = freshData.matchedCompanyId ?? null;
				const notifiedDriverIds = freshData.notifiedDriverIds ?? [];
				const triedCompanyIds = freshData.triedCompanyIds ?? [];

				// Step 1: Try to find another driver in the currently matched company
				if (matchedCompanyId && !triedCompanyIds.includes(matchedCompanyId)) {
					const driver = await findFairDriver(
						db,
						freshData.location,
						matchedCompanyId,
						notifiedDriverIds,
						todayStr,
					);

					if (driver) {
						// Claim for the next driver in the same company
						await db.runTransaction(async (transaction) => {
							const requestRef = db.collection('requests').doc(requestId);
							const requestDoc = await transaction.get(requestRef);
							const data = requestDoc.data();

							if (!data || data.status !== 'searching') return;

							transaction.update(requestRef, {
								status: 'claimed',
								claimedByDriverId: driver.driverId,
								claimExpiresAt: admin.firestore.Timestamp.fromDate(
									new Date(Date.now() + 30 * 1000),
								),
								notifiedDriverIds: admin.firestore.FieldValue.arrayUnion(driver.driverId),
							});
						});

						// Update fairness tracking
						await db.collection('drivers').doc(driver.driverId).update({
							lastAssignedAt: admin.firestore.Timestamp.now(),
							assignmentDate: todayStr,
						});

						logger.info(`Reassigned request ${requestId} to driver ${driver.driverId} in company ${matchedCompanyId}`);
						return;
					}

					// No more drivers in this company — mark it as tried
					await db.collection('requests').doc(requestId).update({
						triedCompanyIds: admin.firestore.FieldValue.arrayUnion(matchedCompanyId),
					});
					logger.info(`Company ${matchedCompanyId} exhausted for request ${requestId}`);
				}

				// Step 2: Advance to next nearest company
				const companies = await findNearestCompanies(db, freshData.location, 100);
				const updatedTriedIds = [
					...triedCompanyIds,
					...(matchedCompanyId && !triedCompanyIds.includes(matchedCompanyId) ? [matchedCompanyId] : []),
				];

				for (const company of companies) {
					if (updatedTriedIds.includes(company.companyId)) continue; // Skip exhausted companies

					const driver = await findFairDriver(
						db,
						freshData.location,
						company.companyId,
						notifiedDriverIds,
						todayStr,
					);

					if (!driver) {
						// Mark this company as tried immediately
						await db.collection('requests').doc(requestId).update({
							triedCompanyIds: admin.firestore.FieldValue.arrayUnion(company.companyId),
						});
						continue;
					}

					// Claim for the driver in the new company
					await db.runTransaction(async (transaction) => {
						const requestRef = db.collection('requests').doc(requestId);
						const requestDoc = await transaction.get(requestRef);
						const data = requestDoc.data();

						if (!data || data.status !== 'searching') return;

						transaction.update(requestRef, {
							status: 'claimed',
							claimedByDriverId: driver.driverId,
							matchedCompanyId: company.companyId,
							claimExpiresAt: admin.firestore.Timestamp.fromDate(
								new Date(Date.now() + 30 * 1000),
							),
							notifiedDriverIds: admin.firestore.FieldValue.arrayUnion(driver.driverId),
						});
					});

					// Update fairness tracking
					await db.collection('drivers').doc(driver.driverId).update({
						lastAssignedAt: admin.firestore.Timestamp.now(),
						assignmentDate: todayStr,
					});

					logger.info(`Reassigned request ${requestId} to driver ${driver.driverId} from company ${company.companyId}`);
					return; // Success
				}

				// All companies exhausted — no drivers available anywhere
				logger.warn(`All companies exhausted for request ${requestId}, setting no_drivers`);
				await db.collection('requests').doc(requestId).update({ status: 'no_drivers' });
			} catch (error) {
				logger.error(`Failed to reassign request ${requestId}:`, error);
			}
		});

		await Promise.all(promises);
		logger.info('Finished processing expired/declined claims');
	},
);
