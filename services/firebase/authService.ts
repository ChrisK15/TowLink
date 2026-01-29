import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './config';

export async function signUpWithEmail(
	email: string,
	password: string,
): Promise<{ userId: string; email: string }> {
	try {
		const userCredential = await createUserWithEmailAndPassword(
			auth,
			email,
			password,
		);
		const user = userCredential.user;
		// Create Firestore Document
		await setDoc(doc(db, 'users', user.uid), {
			id: user.uid,
			email: user.email,
			createdAt: Timestamp.now(),
			role: null,
		});
		return {
			userId: user.uid,
			email: user.email ?? email,
		};
	} catch (error: any) {
		console.error('Signup error:', error);
		if (error.code === 'auth/email-already-in-use') {
			throw new Error(
				'This email is already registered. Please log in or use another one to sign up.',
			);
		}
		if (error.code === 'auth/weak-password') {
			throw new Error('Password is too weak.');
		}
		if (error.code === 'auth/invalid-email') {
			throw new Error('Invalid email format.');
		}
		throw new Error('Failed to create account. Please try again.');
	}
}
