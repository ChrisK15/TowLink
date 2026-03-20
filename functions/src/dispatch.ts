import * as logger from 'firebase-functions/logger';
import { distanceBetween, geohashQueryBounds } from 'geofire-common';

/**
 * Find all affiliated tow yard companies near a location, sorted by distance.
 * Uses geohash range queries on the companies collection, then filters
 * by each company's own serviceRadiusKm.
 */
export async function findNearestCompanies(
	db: FirebaseFirestore.Firestore,
	location: { latitude: number; longitude: number },
	searchRadiusKm: number,
): Promise<Array<{ companyId: string; name: string; distance: number }>> {
	const center = [location.latitude, location.longitude] as [number, number];
	const radiusInM = searchRadiusKm * 1000;
	const bounds = geohashQueryBounds(center, radiusInM);

	logger.info(`findNearestCompanies: ${bounds.length} geohash bounds for ${searchRadiusKm}km radius`);

	const promises = bounds.map((bound) =>
		db.collection('companies')
			.where('geohash', '>=', bound[0])
			.where('geohash', '<=', bound[1])
			.get()
	);
	const snapshots = await Promise.all(promises);

	const companies: Array<{ companyId: string; name: string; distance: number }> = [];
	const seen = new Set<string>(); // deduplicate across geohash bounds

	for (const snap of snapshots) {
		for (const doc of snap.docs) {
			if (seen.has(doc.id)) continue;
			seen.add(doc.id);

			const data = doc.data();
			if (!data.location) continue;

			const companyCenter = [data.location.latitude, data.location.longitude] as [number, number];
			const distance = distanceBetween(center, companyCenter);

			// Only include companies whose service radius covers the commuter's location
			if (distance <= data.serviceRadiusKm) {
				companies.push({ companyId: doc.id, name: data.name, distance });
			}
		}
	}

	companies.sort((a, b) => a.distance - b.distance);
	logger.info(`findNearestCompanies: found ${companies.length} companies in range`);
	return companies;
}

/**
 * Find the fairest available driver in a specific company.
 * Selection criteria:
 * 1. Least-recent assignment — driver with oldest lastAssignedAt gets priority
 * 2. Proximity as tiebreaker — closer driver wins if lastAssignedAt is equal
 * 3. Daily reset — assignments from previous days treated as never-assigned
 * 4. No cooldown — a driver who just completed a trip is immediately eligible
 */
export async function findFairDriver(
	db: FirebaseFirestore.Firestore,
	location: { latitude: number; longitude: number },
	companyId: string,
	excludeDriverIds: string[],
	todayStr: string,
): Promise<{ driverId: string; distance: number } | null> {
	const snap = await db.collection('drivers')
		.where('companyId', '==', companyId)
		.where('isAvailable', '==', true)
		.where('isActivelyDriving', '==', false)
		.get();

	const center = [location.latitude, location.longitude] as [number, number];

	const candidates: Array<{
		driverId: string;
		distance: number;
		lastAssignedAt: { toMillis(): number } | null;
	}> = [];

	for (const doc of snap.docs) {
		if (excludeDriverIds.includes(doc.id)) continue;
		const data = doc.data();
		if (!data.currentLocation) continue;
		// Skip deactivated drivers
		if (data.isActive === false) continue;

		const distance = distanceBetween(center, [
			data.currentLocation.latitude,
			data.currentLocation.longitude,
		]);

		// Daily reset: if assignmentDate is not today, treat lastAssignedAt as null
		const assignmentDate = data.assignmentDate ?? '';
		const isNewDay = assignmentDate !== todayStr;
		const lastAssignedAt = isNewDay ? null : (data.lastAssignedAt ?? null);

		candidates.push({ driverId: doc.id, distance, lastAssignedAt });
	}

	if (candidates.length === 0) {
		logger.info(`findFairDriver: no available drivers in company ${companyId}`);
		return null;
	}

	// Sort: null lastAssignedAt (never assigned today) first = 0ms,
	// then oldest assignment first, then closest distance as tiebreaker
	candidates.sort((a, b) => {
		const aTime = a.lastAssignedAt?.toMillis() ?? 0;
		const bTime = b.lastAssignedAt?.toMillis() ?? 0;
		if (aTime !== bTime) return aTime - bTime;
		return a.distance - b.distance;
	});

	logger.info(`findFairDriver: selected ${candidates[0].driverId} from ${candidates.length} candidates in company ${companyId}`);
	return { driverId: candidates[0].driverId, distance: candidates[0].distance };
}
