import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { setupTestEnvironment, seedUser } from './setup';

let testEnv: RulesTestEnvironment;

const validDriverData = {
	userId: 'driver-1',
	isAvailable: false,
	isVerified: false,
	vehicleInfo: { year: 2020, make: 'Ford', model: 'F-150', color: 'white' },
	currentLocation: { latitude: 34.05, longitude: -118.24 },
	serviceRadius: 15,
	totalTrips: 0,
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

describe('drivers — reads', () => {
	it('allows any authenticated user to read driver profiles', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'drivers', 'driver-1'), validDriverData);
		});
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertSucceeds(getDoc(doc(ctx.firestore(), 'drivers', 'driver-1')));
	});
});

describe('drivers — creates', () => {
	it('allows authenticated user to create their own driver profile with isVerified = false', async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			setDoc(doc(ctx.firestore(), 'drivers', 'driver-1'), validDriverData),
		);
	});

	it('denies user from creating a driver profile with isVerified = true (self-verification)', async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertFails(
			setDoc(doc(ctx.firestore(), 'drivers', 'driver-1'), {
				...validDriverData,
				isVerified: true,
			}),
		);
	});

	it('denies user from creating a driver profile for another uid', async () => {
		await seedUser(testEnv, 'driver-2', 'driver');
		const ctx = testEnv.authenticatedContext('driver-2');
		await assertFails(
			setDoc(doc(ctx.firestore(), 'drivers', 'driver-1'), {
				...validDriverData,
				userId: 'driver-2',
			}),
		);
	});
});

describe('drivers — updates', () => {
	beforeEach(async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'drivers', 'driver-1'), validDriverData);
		});
	});

	it('allows driver to update their own profile (keeping isVerified and userId unchanged)', async () => {
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'drivers', 'driver-1'), {
				isAvailable: true,
				isVerified: false,
				userId: 'driver-1',
			}),
		);
	});

	it('denies driver from changing isVerified on update', async () => {
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertFails(
			updateDoc(doc(ctx.firestore(), 'drivers', 'driver-1'), {
				isVerified: true,
				userId: 'driver-1',
			}),
		);
	});
});
