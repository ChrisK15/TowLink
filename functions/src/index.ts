import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
	distanceBetween,
	geohashQueryBounds
} from 'geofire-common';

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * Find the closest online driver to a location
 */
async function findClosestDriver(
	location: { latitude: number; longitude: number },
	radiusInKm: number,
	excludeDriverIds: string[] = [],
): Promise<{ driverId: string; distance: number } | null> {
	const center = [location.latitude, location.longitude] as [number, number];
	const radiusInM = radiusInKm * 1000;

	// Generate geohash query bounds
	const bounds = geohashQueryBounds(center, radiusInM);
	logger.info(`Generated ${bounds.length} geohash query bounds`);

	const promises = [];
	for (const bound of bounds) {
		const q = db
			.collection('drivers')
			.where('isAvailable', '==', true)
			.where('geohash', '>=', bound[0])
			.where('geohash', '<=', bound[1]);

		promises.push(q.get());
	}

	// Execute all queries in parallel
	const snapshots = await Promise.all(promises);

	// Combine results from all queries
	const drivers: Array<{
		id: string;
		location: { latitude: number; longitude: number };
	}> = [];

	for (const snap of snapshots) {
		for (const doc of snap.docs) {
			const data = doc.data();
			// Skip drivers in the exclude list
			if (excludeDriverIds.includes(doc.id)) {
				continue;
			}
			if (data.currentLocation) {
				drivers.push({
					id: doc.id,
					location: data.currentLocation,
				});
			}
		}
	}

	if (drivers.length === 0) {
		logger.warn('No available drivers found');
		return null;
	}

	// Calculate distances and find closest
	let closestDriver: { driverId: string; distance: number } | null = null;

	for (const driver of drivers) {
		const distance = distanceBetween(center, [
			driver.location.latitude,
			driver.location.longitude,
		]);

		// Only consider drivers within the radius
		if (distance <= radiusInKm) {
			if (!closestDriver || distance < closestDriver.distance) {
				closestDriver = { driverId: driver.id, distance };
			}
		}
	}

	if (closestDriver) {
		logger.info(
			`Found closest driver: ${closestDriver.driverId} at ${closestDriver.distance}km`,
		);
	} else {
		logger.warn('No drivers within radius');
	}

	return closestDriver;
}

// Triggers when a new request is created
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

		// Only process if status is 'searching'
		if (requestData.status !== 'searching') {
			logger.info(`Request ${requestId} is not searching, skipping`);
			return;
		}

		// Find closest driver (within 50km)
		const closestDriver = await findClosestDriver(
			requestData.location,
			50, // 50km radius
			requestData.notifiedDriverIds || [], // Exclude already-notified drivers
		);

		if (!closestDriver) {
			logger.warn(`No available drivers found for request ${requestId}`);
			// Could send notification to commuter: "No drivers available"
			return;
		}

		// Claim the request for the closest driver (using transaction)
		try {
			await db.runTransaction(async (transaction) => {
				const requestRef = db.collection('requests').doc(requestId);
				const requestDoc = await transaction.get(requestRef);
				const data = requestDoc.data();

				// Verify request still exists and is still searching
				if (!data) {
					throw new Error(`Request ${requestId} not found`);
				}
				if (data.status !== 'searching') {
					throw new Error(`Request ${requestId} is already ${data.status}`);
				}

				// Claim the request
				transaction.update(requestRef, {
					status: 'claimed',
					claimedByDriverId: closestDriver.driverId,
					claimExpiresAt: admin.firestore.Timestamp.fromDate(
						new Date(Date.now() + 30 * 1000), // 30 seconds from now
					),
					notifiedDriverIds: admin.firestore.FieldValue.arrayUnion(
						closestDriver.driverId,
					),
				});

				logger.info(
					`Claimed request ${requestId} for driver ${closestDriver.driverId}`,
				);
			});
		} catch (error) {
			logger.error(`Failed to claim request ${requestId}:`, error);
			throw error;
		}
	},
);

// Runs every 10 seconds to handle expired claims
export const handleClaimTimeouts = onSchedule(
	{
		schedule: 'every 10 seconds',
		timeZone: 'America/Los_Angeles', // Change to your timezone
	},
	async (event) => {
		logger.info('Checking for expired claims...');

		const now = admin.firestore.Timestamp.now();

		// Query for expired claims
		const expiredClaimsSnapshot = await db
			.collection('requests')
			.where('status', '==', 'claimed')
			.where('claimExpiresAt', '<=', now)
			.get();

		if (expiredClaimsSnapshot.empty) {
			logger.info('No expired claims found');
			return;
		}

		logger.info(`Found ${expiredClaimsSnapshot.size} expired claims`);

		// Process each expired claim
		const promises = expiredClaimsSnapshot.docs.map(async (doc) => {
			const requestId = doc.id;
			const requestData = doc.data();

			logger.info(`Processing expired claim for request ${requestId}`);

			try {
				// Reset the claim (back to searching)
				await db.runTransaction(async (transaction) => {
					const requestRef = db.collection('requests').doc(requestId);
					const requestDoc = await transaction.get(requestRef);
					const data = requestDoc.data();

					if (!data || data.status !== 'claimed') {
						// Already processed or status changed
						return;
					}

					// Reset to searching
					transaction.update(requestRef, {
						status: 'searching',
						claimedByDriverId: null,
						claimExpiresAt: null,
					});

					logger.info(`Reset request ${requestId} to searching`);
				});

				// Find next closest driver (excluding already-notified drivers)
				const closestDriver = await findClosestDriver(
					requestData.location,
					50,
					requestData.notifiedDriverIds || [],
				);

				if (!closestDriver) {
					logger.warn(`No more available drivers for request ${requestId}`);
					// Could notify commuter: "No drivers available"
					return;
				}

				// Claim for the next driver
				await db.runTransaction(async (transaction) => {
					const requestRef = db.collection('requests').doc(requestId);
					const requestDoc = await transaction.get(requestRef);
					const data = requestDoc.data();

					if (!data || data.status !== 'searching') {
						// Status changed while we were finding a driver
						return;
					}

					transaction.update(requestRef, {
						status: 'claimed',
						claimedByDriverId: closestDriver.driverId,
						claimExpiresAt: admin.firestore.Timestamp.fromDate(
							new Date(Date.now() + 30 * 1000),
						),
						notifiedDriverIds: admin.firestore.FieldValue.arrayUnion(
							closestDriver.driverId,
						),
					});

					logger.info(
						`Reassigned request ${requestId} to driver ${closestDriver.driverId}`,
					);
				});
			} catch (error) {
				logger.error(`Failed to reassign expired request ${requestId}:`, error);
				// Don't throw - continue processing other requests
			}
		});

		// Wait for all reassignments to complete
		await Promise.all(promises);
		logger.info('Finished processing expired claims');
	},
);
