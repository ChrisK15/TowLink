import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { setupTestEnvironment, seedUser, seedCompany } from './setup';

let testEnv: RulesTestEnvironment;

const validCompanyData = {
	name: 'Test Tow Yard',
	ownerUid: 'admin-1',
	address: '123 Main St',
	createdAt: Timestamp.now(),
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

describe('companies — reads', () => {
	it('allows unauthenticated user to read companies (D-01: public read for pre-auth signup)', async () => {
		await seedCompany(testEnv, 'company-1', 'admin-1');
		const ctx = testEnv.unauthenticatedContext();
		await assertSucceeds(getDoc(doc(ctx.firestore(), 'companies', 'company-1')));
	});

	it('allows authenticated user to read companies', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		await seedCompany(testEnv, 'company-1', 'admin-1');
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertSucceeds(getDoc(doc(ctx.firestore(), 'companies', 'company-1')));
	});
});

describe('companies — creates', () => {
	it('allows admin to create a company with ownerUid equal to their uid', async () => {
		await seedUser(testEnv, 'admin-1', 'admin');
		const ctx = testEnv.authenticatedContext('admin-1');
		await assertSucceeds(
			setDoc(doc(ctx.firestore(), 'companies', 'company-1'), validCompanyData),
		);
	});

	it('denies non-admin (commuter) from creating a company', async () => {
		await seedUser(testEnv, 'commuter-1', 'commuter');
		const ctx = testEnv.authenticatedContext('commuter-1');
		await assertFails(
			setDoc(doc(ctx.firestore(), 'companies', 'company-1'), {
				...validCompanyData,
				ownerUid: 'commuter-1',
			}),
		);
	});

	it('denies non-admin (driver) from creating a company', async () => {
		await seedUser(testEnv, 'driver-1', 'driver');
		const ctx = testEnv.authenticatedContext('driver-1');
		await assertFails(
			setDoc(doc(ctx.firestore(), 'companies', 'company-1'), {
				...validCompanyData,
				ownerUid: 'driver-1',
			}),
		);
	});
});

describe('companies — updates', () => {
	beforeEach(async () => {
		await seedUser(testEnv, 'admin-1', 'admin');
		await seedCompany(testEnv, 'company-1', 'admin-1');
	});

	it('allows company owner (admin) to update their company', async () => {
		const ctx = testEnv.authenticatedContext('admin-1');
		await assertSucceeds(
			updateDoc(doc(ctx.firestore(), 'companies', 'company-1'), {
				name: 'Updated Tow Yard',
			}),
		);
	});

	it('denies non-owner from updating a company', async () => {
		await seedUser(testEnv, 'other-admin', 'admin');
		const ctx = testEnv.authenticatedContext('other-admin');
		await assertFails(
			updateDoc(doc(ctx.firestore(), 'companies', 'company-1'), {
				name: 'Hijacked Name',
			}),
		);
	});
});

describe('companies — deletes', () => {
	it('denies anyone from deleting a company', async () => {
		await seedUser(testEnv, 'admin-1', 'admin');
		await seedCompany(testEnv, 'company-1', 'admin-1');
		const ctx = testEnv.authenticatedContext('admin-1');
		await assertFails(deleteDoc(doc(ctx.firestore(), 'companies', 'company-1')));
	});
});
