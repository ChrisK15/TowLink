/**
 * Integration tests for company-based dispatch logic.
 * Runs against the Firebase Firestore emulator — no mocks.
 *
 * Prerequisites:
 *   firebase emulators:start --only firestore
 *   cd functions && npm run test:integration
 *
 * Or all-in-one:
 *   firebase emulators:exec --only firestore 'cd functions && npm run test:integration'
 */

// Must be set before firebase-admin is imported
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';

import * as admin from 'firebase-admin';
import { geohashForLocation } from 'geofire-common';
import { findFairDriver, findNearestCompanies } from '../dispatch';

const PROJECT_ID = 'towlink-test';

let app: admin.app.App;
let db: FirebaseFirestore.Firestore;

// Downtown LA — commuter location for all tests
const COMMUTER_LOCATION = { latitude: 34.0522, longitude: -118.2437 };

beforeAll(() => {
	app = admin.initializeApp({ projectId: PROJECT_ID }, 'integration-test');
	db = app.firestore();
});

afterAll(async () => {
	await app.delete();
});

afterEach(async () => {
	// Clear all Firestore data between tests via emulator REST API
	await fetch(
		`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
		{ method: 'DELETE' },
	);
});

// ── Helpers ──────────────────────────────────────────────────

async function seedCompany(
	id: string,
	opts: { lat: number; lng: number; name: string; serviceRadiusKm: number },
) {
	const geohash = geohashForLocation([opts.lat, opts.lng]);
	await db.collection('companies').doc(id).set({
		name: opts.name,
		location: { latitude: opts.lat, longitude: opts.lng },
		geohash,
		serviceRadiusKm: opts.serviceRadiusKm,
		authorizedEmails: [],
		ownerUid: 'owner-test',
	});
}

async function seedDriver(
	id: string,
	opts: {
		companyId: string;
		lat: number;
		lng: number;
		isAvailable?: boolean;
		isActive?: boolean;
		lastAssignedAt?: admin.firestore.Timestamp | null;
		assignmentDate?: string;
	},
) {
	await db.collection('drivers').doc(id).set({
		userId: id,
		companyId: opts.companyId,
		isAvailable: opts.isAvailable ?? true,
		isActivelyDriving: false,
		isActive: opts.isActive ?? true,
		currentLocation: { latitude: opts.lat, longitude: opts.lng },
		geohash: geohashForLocation([opts.lat, opts.lng]),
		lastAssignedAt: opts.lastAssignedAt ?? null,
		assignmentDate: opts.assignmentDate ?? '',
		serviceRadius: 10,
		totalTrips: 0,
	});
}

function todayStr(): string {
	return new Date().toISOString().split('T')[0];
}

// ── Tests ────────────────────────────────────────────────────

describe('findNearestCompanies (emulator)', () => {
	it('returns companies sorted by distance, filtered by serviceRadiusKm', async () => {
		// Company A: ~1.5km from commuter, 25km radius — should be included
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Nearby Towing', serviceRadiusKm: 25,
		});
		// Company B: ~50km from commuter, 10km radius — commuter outside its radius
		await seedCompany('compB', {
			lat: 34.5022, lng: -118.0437, name: 'Far Away Towing', serviceRadiusKm: 10,
		});
		// Company C: ~7km from commuter, 30km radius — should be included
		await seedCompany('compC', {
			lat: 34.1022, lng: -118.1937, name: 'Mid-Range Towing', serviceRadiusKm: 30,
		});

		const result = await findNearestCompanies(db, COMMUTER_LOCATION, 100);

		// Company B filtered out (50km away but only 10km service radius)
		expect(result).toHaveLength(2);
		// Sorted by distance: compA (~1.5km) before compC (~7km)
		expect(result[0].companyId).toBe('compA');
		expect(result[1].companyId).toBe('compC');
	});

	it('returns empty array when no companies in range', async () => {
		// Only company is 50km away with 10km radius
		await seedCompany('farComp', {
			lat: 34.5022, lng: -118.0437, name: 'Far Away', serviceRadiusKm: 10,
		});

		const result = await findNearestCompanies(db, COMMUTER_LOCATION, 100);
		expect(result).toHaveLength(0);
	});
});

describe('findFairDriver (emulator)', () => {
	const today = todayStr();

	it('selects the driver with null lastAssignedAt (never assigned) first', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Test Co', serviceRadiusKm: 25,
		});
		// Driver 1: assigned recently today
		await seedDriver('driver1', {
			companyId: 'compA', lat: 34.055, lng: -118.24,
			lastAssignedAt: admin.firestore.Timestamp.now(),
			assignmentDate: today,
		});
		// Driver 2: never assigned
		await seedDriver('driver2', {
			companyId: 'compA', lat: 34.058, lng: -118.25,
		});

		const result = await findFairDriver(db, COMMUTER_LOCATION, 'compA', [], today);

		expect(result).not.toBeNull();
		expect(result!.driverId).toBe('driver2');
	});

	it('uses proximity as tiebreaker when both never assigned', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Test Co', serviceRadiusKm: 25,
		});
		// Driver far: never assigned, 10km away
		await seedDriver('driverFar', {
			companyId: 'compA', lat: 34.15, lng: -118.24,
		});
		// Driver close: never assigned, 1km away
		await seedDriver('driverClose', {
			companyId: 'compA', lat: 34.055, lng: -118.245,
		});

		const result = await findFairDriver(db, COMMUTER_LOCATION, 'compA', [], today);

		expect(result).not.toBeNull();
		expect(result!.driverId).toBe('driverClose');
	});

	it('treats previous-day assignments as never-assigned (daily reset)', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Test Co', serviceRadiusKm: 25,
		});
		// Driver 1: assigned today, closer
		await seedDriver('driverToday', {
			companyId: 'compA', lat: 34.053, lng: -118.244,
			lastAssignedAt: admin.firestore.Timestamp.now(),
			assignmentDate: today,
		});
		// Driver 2: assigned yesterday (should reset to null = highest priority), farther
		await seedDriver('driverYesterday', {
			companyId: 'compA', lat: 34.07, lng: -118.26,
			lastAssignedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 86400000)),
			assignmentDate: '2020-01-01',
		});

		const result = await findFairDriver(db, COMMUTER_LOCATION, 'compA', [], today);

		expect(result).not.toBeNull();
		// Yesterday's driver resets to "never assigned today" = priority
		expect(result!.driverId).toBe('driverYesterday');
	});

	it('excludes drivers in excludeDriverIds list', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Test Co', serviceRadiusKm: 25,
		});
		await seedDriver('driver1', { companyId: 'compA', lat: 34.055, lng: -118.245 });
		await seedDriver('driver2', { companyId: 'compA', lat: 34.058, lng: -118.25 });

		const result = await findFairDriver(db, COMMUTER_LOCATION, 'compA', ['driver1'], today);

		expect(result).not.toBeNull();
		expect(result!.driverId).toBe('driver2');
	});

	it('returns null when all drivers excluded (company exhausted)', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Test Co', serviceRadiusKm: 25,
		});
		await seedDriver('driver1', { companyId: 'compA', lat: 34.055, lng: -118.245 });
		await seedDriver('driver2', { companyId: 'compA', lat: 34.058, lng: -118.25 });

		const result = await findFairDriver(
			db, COMMUTER_LOCATION, 'compA', ['driver1', 'driver2'], today,
		);

		expect(result).toBeNull();
	});

	it('skips unavailable drivers', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Test Co', serviceRadiusKm: 25,
		});
		await seedDriver('driverOffline', {
			companyId: 'compA', lat: 34.053, lng: -118.244, isAvailable: false,
		});
		await seedDriver('driverOnline', {
			companyId: 'compA', lat: 34.058, lng: -118.25, isAvailable: true,
		});

		const result = await findFairDriver(db, COMMUTER_LOCATION, 'compA', [], today);

		expect(result).not.toBeNull();
		expect(result!.driverId).toBe('driverOnline');
	});

	it('skips deactivated drivers (isActive: false)', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Test Co', serviceRadiusKm: 25,
		});
		await seedDriver('driverDeactivated', {
			companyId: 'compA', lat: 34.053, lng: -118.244, isActive: false,
		});
		await seedDriver('driverActive', {
			companyId: 'compA', lat: 34.058, lng: -118.25, isActive: true,
		});

		const result = await findFairDriver(db, COMMUTER_LOCATION, 'compA', [], today);

		expect(result).not.toBeNull();
		expect(result!.driverId).toBe('driverActive');
	});

	it('returns null when no drivers in company', async () => {
		await seedCompany('emptyComp', {
			lat: 34.0622, lng: -118.2337, name: 'Empty Co', serviceRadiusKm: 25,
		});

		const result = await findFairDriver(db, COMMUTER_LOCATION, 'emptyComp', [], today);
		expect(result).toBeNull();
	});
});

describe('Full dispatch flow (emulator)', () => {
	const today = todayStr();

	it('DISP-01: routes to nearest company', async () => {
		// Two companies, CompA closer
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Nearby Towing', serviceRadiusKm: 25,
		});
		await seedCompany('compB', {
			lat: 34.1522, lng: -118.1437, name: 'Farther Towing', serviceRadiusKm: 50,
		});
		await seedDriver('driverA1', { companyId: 'compA', lat: 34.055, lng: -118.245 });
		await seedDriver('driverB1', { companyId: 'compB', lat: 34.14, lng: -118.15 });

		// Simulate matchDriverOnRequestCreate logic
		const companies = await findNearestCompanies(db, COMMUTER_LOCATION, 100);
		expect(companies.length).toBeGreaterThanOrEqual(2);
		expect(companies[0].companyId).toBe('compA'); // Nearest

		const driver = await findFairDriver(db, COMMUTER_LOCATION, companies[0].companyId, [], today);
		expect(driver).not.toBeNull();
		expect(driver!.driverId).toBe('driverA1'); // From nearest company
	});

	it('DISP-02: fair assignment — second request goes to different driver', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Test Co', serviceRadiusKm: 25,
		});
		await seedDriver('driver1', {
			companyId: 'compA', lat: 34.055, lng: -118.245,
		});
		await seedDriver('driver2', {
			companyId: 'compA', lat: 34.058, lng: -118.25,
		});

		// First assignment: both never assigned, driver1 is closer → gets picked
		const first = await findFairDriver(db, COMMUTER_LOCATION, 'compA', [], today);
		expect(first).not.toBeNull();
		const firstDriverId = first!.driverId;

		// Simulate fairness update (what matchDriverOnRequestCreate does after claiming)
		await db.collection('drivers').doc(firstDriverId).update({
			lastAssignedAt: admin.firestore.Timestamp.now(),
			assignmentDate: today,
		});

		// Second assignment: first driver now has recent lastAssignedAt → other driver gets picked
		const second = await findFairDriver(db, COMMUTER_LOCATION, 'compA', [], today);
		expect(second).not.toBeNull();
		expect(second!.driverId).not.toBe(firstDriverId);
	});

	it('DISP-03: decline re-assignment — excluded driver skipped, next driver picked', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Test Co', serviceRadiusKm: 25,
		});
		await seedDriver('driver1', { companyId: 'compA', lat: 34.055, lng: -118.245 });
		await seedDriver('driver2', { companyId: 'compA', lat: 34.058, lng: -118.25 });

		// First pick
		const first = await findFairDriver(db, COMMUTER_LOCATION, 'compA', [], today);
		expect(first).not.toBeNull();

		// Driver declined → added to notifiedDriverIds (excluded)
		const reassigned = await findFairDriver(
			db, COMMUTER_LOCATION, 'compA', [first!.driverId], today,
		);
		expect(reassigned).not.toBeNull();
		expect(reassigned!.driverId).not.toBe(first!.driverId);
	});

	it('DISP-03: company exhausted → falls through to next company', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Nearby (1 driver)', serviceRadiusKm: 25,
		});
		await seedCompany('compB', {
			lat: 34.1022, lng: -118.1937, name: 'Mid-Range (1 driver)', serviceRadiusKm: 30,
		});
		await seedDriver('driverA', { companyId: 'compA', lat: 34.055, lng: -118.245 });
		await seedDriver('driverB', { companyId: 'compB', lat: 34.1, lng: -118.2 });

		// Get companies sorted by distance
		const companies = await findNearestCompanies(db, COMMUTER_LOCATION, 100);
		expect(companies[0].companyId).toBe('compA');

		// Company A's only driver already notified
		const fromA = await findFairDriver(
			db, COMMUTER_LOCATION, 'compA', ['driverA'], today,
		);
		expect(fromA).toBeNull(); // Exhausted

		// Fall through to Company B
		const fromB = await findFairDriver(
			db, COMMUTER_LOCATION, companies[1].companyId, ['driverA'], today,
		);
		expect(fromB).not.toBeNull();
		expect(fromB!.driverId).toBe('driverB');
	});

	it('no_drivers: all companies exhausted → no driver found', async () => {
		await seedCompany('compA', {
			lat: 34.0622, lng: -118.2337, name: 'Only Company', serviceRadiusKm: 25,
		});
		await seedDriver('onlyDriver', { companyId: 'compA', lat: 34.055, lng: -118.245 });

		const companies = await findNearestCompanies(db, COMMUTER_LOCATION, 100);
		expect(companies).toHaveLength(1);

		// Only driver already notified
		const result = await findFairDriver(
			db, COMMUTER_LOCATION, 'compA', ['onlyDriver'], today,
		);
		expect(result).toBeNull();
		// At this point matchDriverOnRequestCreate would set status: 'no_drivers'
	});
});
