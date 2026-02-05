import {
	createUserWithEmailAndPassword,
	signOut as firebaseSignOut,
	signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';

export async function signInWithEmail(
	email: string,
	password: string,
): Promise<{ userId: string; email: string; role: string | null }> {
	try {
		const userCredential = await signInWithEmailAndPassword(
			auth,
			email,
			password,
		);
		const user = userCredential.user;
		const docRef = doc(db, 'users', user.uid);
		const userDoc = await getDoc(docRef);
		return {
			userId: user.uid,
			email: user.email ?? email,
			role: userDoc.data()?.role ?? null,
		};
	} catch (error: any) {
		console.error('Login error:', error);
		if (error.code === 'auth/invalid-email') {
			throw new Error('Invalid email format.');
		}
		if (error.code === 'auth/invalid-credential') {
			throw new Error('Invalid email or password. Please check and try again.');
		}
		if (error.code === 'auth/user-not-found') {
			throw new Error(
				'No account found with this email. Please sign up first.',
			);
		}
		if (error.code === 'auth/wrong-password') {
			throw new Error('Incorrect password. Please try again.');
		}
		throw new Error('Login failed. Please try again.');
	}
}

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

export async function updateUserRole(
	userId: string,
	role: 'commuter' | 'driver',
): Promise<void> {
	const docRef = doc(db, 'users', userId);
	try {
		await updateDoc(docRef, { role: role });
	} catch (error: any) {
		console.error('Role selection error:', error);
		throw new Error('Error selecting role. Please try again.');
	}
}

export async function signOut() {
	try {
		await firebaseSignOut(auth);
	} catch (error: any) {
		console.log(error.message);
	}
}
