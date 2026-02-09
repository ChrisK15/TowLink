import { signOut } from '@/services/firebase/authService';
import { auth, db } from '@/services/firebase/config';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
	user: FirebaseUser | null;
	role: 'commuter' | 'driver' | null;
	loading: boolean;
	signOut: () => Promise<void>;
	refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<FirebaseUser | null>(null);
	const [role, setRole] = useState<'commuter' | 'driver' | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				setUser(firebaseUser);
				try {
					const docRef = doc(db, 'users', firebaseUser.uid);
					const userDoc = await getDoc(docRef);
					const data = userDoc.data();
					if (data?.role === 'commuter' || data?.role === 'driver') {
						setRole(data?.role);
					} else {
						setRole(null);
					}
				} catch (error: any) {
					console.error('Error fetching user role', error);
					setRole(null);
				} finally {
					setLoading(false);
				}
			} else {
				setUser(null);
				setRole(null);
				setLoading(false);
			}
		});

		return () => unsubscribe();
	}, []);

	async function refreshRole() {
		if (!user) return;
		try {
			const docRef = doc(db, 'users', user.uid);
			const userDoc = await getDoc(docRef);
			const data = userDoc.data();
			if (data?.role === 'commuter' || data?.role === 'driver') {
				setRole(data?.role);
			} else {
				setRole(null);
			}
		} catch (error: any) {
			console.error('Error while refreshing role:', error);
			setRole(null);
		}
	}

	return (
		<AuthContext.Provider value={{ user, role, loading, signOut, refreshRole }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth(): AuthContextType {
	const value = useContext(AuthContext);
	if (!value) {
		throw new Error('No context');
	}
	return value;
}
