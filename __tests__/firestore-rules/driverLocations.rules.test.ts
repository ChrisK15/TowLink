import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { setupTestEnvironment, seedUser } from './setup';

let testEnv: RulesTestEnvironment;

const validLocationData = {
	driverId: 'driver-1',
	latitude: 34.05,
	longitude: -118.24,
	updatedAt: Timestamp.now(),
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

describe('driverLocations — reads', () => {
	it('allows any authenticated user to read driver locations', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1'), validLocationData);
		});
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertSucceeds(getDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1')));
	});
});

describe('driverLocations — creates', () => {
	it('allows driver to create their own location document', async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			setDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1'), validLocationData),
		);
	});

	it('denies driver from creating a location document for another driver', async () => {
		await seedUser(testEnv, 'driver-2', 'driver');
		const ctx = testEnv.authenticatedContext('driver-2');
		// Attempting to create a driverLocations doc for driver-1 while authenticated as driver-2
		await assertFails(
			setDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1'), {
				...validLocationData,
				driverId: 'driver-2',
			}),
		);
	});
});

describe('driverLocations — updates', () => {
	it('allows driver to update their own location document', async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1'), validLocationData);
		});
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1'), {
				driverId: 'driver-1',
				latitude: 34.07,
				longitude: -118.26,
				updatedAt: Timestamp.now(),
			}),
		);
	});
});

describe('driverLocations — deletes', () => {
	it('allows driver to delete their own location document (going offline)', async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1'), validLocationData);
		});
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(deleteDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1')));
	});

	it('denies driver from deleting another drivers location document', async () => {
		await seedUser(testEnv, 'driver-2', 'driver');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1'), validLocationData);
		});
		const ctx = testEnv.authenticatedContext('driver-2');
		await assertFails(deleteDoc(doc(ctx.firestore(), 'driverLocations', 'driver-1')));
	});
});
