import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "./config";

export async function signUpWithEmail(
	email: string,
	password: string
): Promise<{ userId: string; email: string }> {
	try {
		const userCredential = await createUserWithEmailAndPassword(auth, email, password);
		const user = userCredential.user;
		// Create Firestore Document
		await setDoc(doc(db, "users", user.uid), {
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
		throw error;
	}
}