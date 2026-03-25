import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { setupTestEnvironment, seedUser } from './setup';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
	testEnv = await setupTestEnvironment();
});

afterEach(async () => {
	await testEnv.clearFirestore();
});

afterAll(async () => {
	await testEnv.cleanup();
});

describe('users — reads', () => {
	it('allows authenticated user to read any user profile', async () => {
		await seedUser(testEnv, 'user-1', 'commuter');
		await seedUser(testEnv, 'user-2', 'driver');
		const ctx = testEnv.authenticatedContext('user-1');
		await assertSucceeds(getDoc(doc(ctx.firestore(), 'users', 'user-2')));
	});

	it('denies unauthenticated user from reading a user profile', async () => {
		await seedUser(testEnv, 'user-1', 'commuter');
		const ctx = testEnv.unauthenticatedContext();
		await assertFails(getDoc(doc(ctx.firestore(), 'users', 'user-1')));
	});
});

describe('users — creates', () => {
	it('allows user to create their own profile with matching email', async () => {
		// authenticatedContext second arg sets token claims including email
		const ctx = testEnv.authenticatedContext('new-user', {
			email: 'new-user@test.com',
		});
		await assertSucceeds(
			setDoc(doc(ctx.firestore(), 'users', 'new-user'), {
				email: 'new-user@test.com',
				createdAt: Timestamp.now(),
				role: 'commuter',
			}),
		);
	});

	it('denies user from creating a profile for another uid', async () => {
		const ctx = testEnv.authenticatedContext('user-a', {
			email: 'user-a@test.com',
		});
		await assertFails(
			setDoc(doc(ctx.firestore(), 'users', 'user-b'), {
				email: 'user-a@test.com',
				createdAt: Timestamp.now(),
			}),
		);
	});
});

describe('users — updates', () => {
	it('allows user to update their own profile (keeping immutable fields)', async () => {
		// Use a fixed timestamp so the equality check in the rule passes
		const fixedTime = Timestamp.fromDate(new Date('2025-01-01T00:00:00Z'));
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'users', 'user-1'), {
				id: 'user-1',
				email: 'user-1@test.com',
				role: 'commuter',
				createdAt: fixedTime,
			});
		});
		const ctx = testEnv.authenticatedContext('user-1');
		// Must send back the same immutable fields (id, email, createdAt) unchanged
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'users', 'user-1'), {
				id: 'user-1',
				email: 'user-1@test.com',
				role: 'commuter',
				createdAt: fixedTime,
				displayName: 'Test User',
			}),
		);
	});

	it('denies user from changing their own email', async () => {
		const fixedTime = Timestamp.fromDate(new Date('2025-01-01T00:00:00Z'));
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'users', 'user-1'), {
				id: 'user-1',
				email: 'user-1@test.com',
				role: 'commuter',
				createdAt: fixedTime,
			});
		});
		const ctx = testEnv.authenticatedContext('user-1');
		await assertFails(
			updateDoc(doc(ctx.firestore(), 'users', 'user-1'), {
				id: 'user-1',
				email: 'newemail@test.com',
				role: 'commuter',
				createdAt: fixedTime,
			}),
		);
	});

	it('allows admin to update a driver in the same company (deactivation)', async () => {
		const companyId = 'company-1';
		const fixedTime = Timestamp.fromDate(new Date('2025-01-01T00:00:00Z'));
		await seedUser(testEnv, 'admin-1', 'admin', { companyId });
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			await setDoc(doc(ctx.firestore(), 'users', 'driver-1'), {
				id: 'driver-1',
				email: 'driver-1@test.com',
				role: 'driver',
				createdAt: fixedTime,
				companyId,
				isActive: true,
			});
		});
		const ctx = testEnv.authenticatedContext('admin-1');
		// Admin can change isActive but must preserve id, email, role, createdAt
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'users', 'driver-1'), {
				id: 'driver-1',
				email: 'driver-1@test.com',
				role: 'driver',
				createdAt: fixedTime,
				companyId,
				isActive: false,
			}),
		);
	});
});
