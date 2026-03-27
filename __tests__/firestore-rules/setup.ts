import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export async function setupTestEnvironment(): Promise<RulesTestEnvironment> {
	const testEnv = await initializeTestEnvironment({
		projectId: 'towlink-test-' + Date.now(),
		firestore: {
			rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
			host: 'localhost',
			port: 8080,
		},
	});
	return testEnv;
}

export async function seedUser(
	env: RulesTestEnvironment,
	uid: string,
	role: string,
	extra?: Record<string, unknown>,
) {
	await env.withSecurityRulesDisabled(async (ctx) => {
		await setDoc(doc(ctx.firestore(), 'users', uid), {
			email: `${uid}@test.com`,
			role,
			createdAt: Timestamp.now(),
			...extra,
		});
	});
}

export async function seedCompany(
	env: RulesTestEnvironment,
	companyId: string,
	ownerUid: string,
) {
	await env.withSecurityRulesDisabled(async (ctx) => {
		await setDoc(doc(ctx.firestore(), 'companies', companyId), {
			name: 'Test Tow Yard',
			ownerUid,
			address: '123 Test St',
			createdAt: Timestamp.now(),
		});
	});
}
