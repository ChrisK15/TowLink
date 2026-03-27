import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { setupTestEnvironment, seedUser } from './setup';

let testEnv: RulesTestEnvironment;

const validTripData = {
	requestId: 'req-1',
	commuterId: 'commuter-1',
	driverId: 'driver-1',
	status: 'en_route',
	pickupLocation: { latitude: 34.05, longitude: -118.24 },
	dropoffLocation: { latitude: 34.06, longitude: -118.25 },
	startTime: Timestamp.now(),
	estimatedPrice: 65,
	distance: 0,
};

beforeAll(async () => {
	testEnv = await setupTestEnvironment();
});

afterEach(async () => {
	await testEnv.clearFirestore();
});

afterAll(async () => {
	await testEnv.cleanup();
});

describe('trips — reads', () => {
	it('allows trip participant (commuter) to read their own trip', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'trips', 'trip-1'), validTripData);
		});
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertSucceeds(getDoc(doc(ctx.firestore(), 'trips', 'trip-1')));
	});

	it('allows trip participant (driver) to read their own trip', async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'trips', 'trip-1'), validTripData);
		});
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(getDoc(doc(ctx.firestore(), 'trips', 'trip-1')));
	});

	it('denies unrelated user from reading a trip they are not part of', async () => {
		await seedUser(testEnv, 'other-user', 'commuter');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'trips', 'trip-1'), validTripData);
		});
		const ctx = testEnv.authenticatedContext('other-user');
		await assertFails(getDoc(doc(ctx.firestore(), 'trips', 'trip-1')));
	});

	it('allows admin to read a trip belonging to their company', async () => {
		const companyId = 'company-1';
		await seedUser(testEnv, 'admin-1', 'admin', { companyId });
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'trips', 'trip-1'), {
				...validTripData,
				companyId,
			});
		});
		const ctx = testEnv.authenticatedContext('admin-1');
		await assertSucceeds(getDoc(doc(ctx.firestore(), 'trips', 'trip-1')));
	});
});

describe('trips — creates', () => {
	it('allows driver to create a trip with required fields', async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			setDoc(doc(ctx.firestore(), 'trips', 'trip-1'), validTripData),
		);
	});

	it('denies commuter from creating a trip', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertFails(
			setDoc(doc(ctx.firestore(), 'trips', 'trip-1'), {
				...validTripData,
				driverId: 'commuter-1',
			}),
		);
	});
});

describe('trips — state machine transitions', () => {
	beforeEach(async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'trips', 'trip-1'), validTripData);
		});
	});

	it('allows driver to advance trip from en_route to arrived', async () => {
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'trips', 'trip-1'), {
				status: 'arrived',
				arrivalTime: Timestamp.now(),
				requestId: 'req-1',
				commuterId: 'commuter-1',
				driverId: 'driver-1',
				startTime: validTripData.startTime,
			}),
		);
	});

	it('allows driver to advance trip from arrived to in_progress', async () => {
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'trips', 'trip-1'), {
				...validTripData,
				status: 'arrived',
				arrivalTime: Timestamp.now(),
			});
		});
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'trips', 'trip-1'), {
				status: 'in_progress',
				startedAt: Timestamp.now(),
				requestId: 'req-1',
				commuterId: 'commuter-1',
				driverId: 'driver-1',
				startTime: validTripData.startTime,
			}),
		);
	});

	it('allows driver to advance trip from in_progress to completed', async () => {
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'trips', 'trip-1'), {
				...validTripData,
				status: 'in_progress',
				startedAt: Timestamp.now(),
			});
		});
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'trips', 'trip-1'), {
				status: 'completed',
				completionTime: Timestamp.now(),
				requestId: 'req-1',
				commuterId: 'commuter-1',
				driverId: 'driver-1',
				startTime: validTripData.startTime,
			}),
		);
	});

	it('denies driver from skipping states (en_route -> completed)', async () => {
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertFails(
			updateDoc(doc(ctx.firestore(), 'trips', 'trip-1'), {
				status: 'completed',
				completionTime: Timestamp.now(),
				requestId: 'req-1',
				commuterId: 'commuter-1',
				driverId: 'driver-1',
				startTime: validTripData.startTime,
			}),
		);
	});

	it('allows commuter to cancel their own trip', async () => {
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'trips', 'trip-1'), {
				status: 'cancelled',
			}),
		);
	});
});
