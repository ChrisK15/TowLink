import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { setupTestEnvironment, seedUser } from './setup';

let testEnv: RulesTestEnvironment;

const validRequestData = {
	commuterId: 'commuter-1',
	location: { latitude: 34.05, longitude: -118.24 },
	dropoffLocation: { latitude: 34.06, longitude: -118.25 },
	pickupAddress: '123 Main St',
	dropoffAddress: '456 Oak Ave',
	vehicleInfo: { year: 2020, make: 'Toyota', model: 'Camry' },
	estimatedPrice: 65,
	totalTripDistance: 3,
	serviceType: 'tow',
	status: 'searching',
	createdAt: Timestamp.now(),
	expiresAt: Timestamp.fromDate(new Date(Date.now() + 600000)),
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

describe('requests — reads', () => {
	it('allows any authenticated user to read requests', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'requests', 'req-1'), validRequestData);
		});
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertSucceeds(getDoc(doc(ctx.firestore(), 'requests', 'req-1')));
	});

	it('denies unauthenticated user from reading requests', async () => {
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'requests', 'req-1'), validRequestData);
		});
		const ctx = testEnv.unauthenticatedContext();
		await assertFails(getDoc(doc(ctx.firestore(), 'requests', 'req-1')));
	});
});

describe('requests — creates', () => {
	it('allows commuter to create a request for themselves', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertSucceeds(
			setDoc(doc(ctx.firestore(), 'requests', 'req-1'), validRequestData),
		);
	});

	it('denies driver from creating a request', async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertFails(
			setDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				...validRequestData,
				commuterId: 'driver-1',
			}),
		);
	});

	it('denies unauthenticated user from creating a request', async () => {
		const ctx = testEnv.unauthenticatedContext();
		await assertFails(
			setDoc(doc(ctx.firestore(), 'requests', 'req-1'), validRequestData),
		);
	});

	it('denies commuter from creating a request for another commuter', async () => {
		await seedUser(testEnv, 'commuter-2', 'commuter');
		const ctx = testEnv.authenticatedContext('commuter-2');
		// commuterId is 'commuter-1' but auth uid is 'commuter-2'
		await assertFails(
			setDoc(doc(ctx.firestore(), 'requests', 'req-1'), validRequestData),
		);
	});
});

describe('requests — updates (commuter)', () => {
	beforeEach(async () => {
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'requests', 'req-1'), validRequestData);
		});
	});

	it('allows commuter to cancel their own request', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				status: 'cancelled',
				commuterId: 'commuter-1',
			}),
		);
	});

	it('denies commuter from cancelling another commuterrsquos request', async () => {
		await seedUser(testEnv, 'commuter-2', 'commuter');
		const ctx = testEnv.authenticatedContext('commuter-2');
		await assertFails(
			updateDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				status: 'cancelled',
			}),
		);
	});
});

describe('requests — updates (driver)', () => {
	it('allows driver to claim a searching request', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await seedUser(testEnv, 'driver-1', 'driver');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'requests', 'req-1'), validRequestData);
		});
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				status: 'claimed',
				claimedByDriverId: 'driver-1',
				commuterId: 'commuter-1',
				claimExpiresAt: Timestamp.fromDate(new Date(Date.now() + 60000)),
				notifiedDriverIds: ['driver-1'],
			}),
		);
	});

	it('allows driver to accept a claimed request they claimed', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await seedUser(testEnv, 'driver-1', 'driver');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				...validRequestData,
				status: 'claimed',
				claimedByDriverId: 'driver-1',
			});
		});
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				status: 'accepted',
				matchedDriverId: 'driver-1',
				claimedByDriverId: 'driver-1',
				commuterId: 'commuter-1',
			}),
		);
	});

	it('denies driver from accepting a request claimed by another driver', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await seedUser(testEnv, 'driver-1', 'driver');
		await seedUser(testEnv, 'driver-2', 'driver');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				...validRequestData,
				status: 'claimed',
				claimedByDriverId: 'driver-1',
			});
		});
		// driver-2 tries to accept a request claimed by driver-1
		const ctx = testEnv.authenticatedContext('driver-2');
		await assertFails(
			updateDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				status: 'accepted',
				matchedDriverId: 'driver-2',
			}),
		);
	});

	it('allows driver to decline a claimed request (return to searching)', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await seedUser(testEnv, 'driver-1', 'driver');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				...validRequestData,
				status: 'claimed',
				claimedByDriverId: 'driver-1',
			});
		});
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'requests', 'req-1'), {
				status: 'searching',
				claimedByDriverId: null,
				commuterId: 'commuter-1',
			}),
		);
	});
});
