import { Company, Trip, User } from '@/types/models';
import {
	addDoc,
	arrayUnion,
	collection,
	doc,
	getDocs,
	onSnapshot,
	query,
	Timestamp,
	updateDoc,
	where,
} from 'firebase/firestore';
import { geocodeAddress, getGeohash } from '../geoLocationUtils';
import { db } from './config';

// COMP-01: Create a new company document in Firestore.
// Geocodes the admin-supplied address to lat/lng, computes geohash for Phase 2 proximity queries.
// Returns the new document ID.
export async function createCompany(
	name: string,
	address: string,
	serviceRadiusKm: number,
	adminUid: string,
): Promise<string> {
	const coords = await geocodeAddress(address);
	if (!coords) {
		throw new Error(
			'Could not geocode address. Please check the address and try again.',
		);
	}
	const companyData = {
		name,
		address,
		location: { latitude: coords.latitude, longitude: coords.longitude },
		geohash: getGeohash(coords.latitude, coords.longitude),
		serviceRadiusKm,
		authorizedEmails: [],
		ownerUid: adminUid,
		createdAt: Timestamp.now(),
	};
	const docRef = await addDoc(collection(db, 'companies'), companyData);
	return docRef.id;
}

// COMP-02: Add a driver email to the company's authorized list.
// Uses arrayUnion so duplicate adds are idempotent.
export async function addAuthorizedEmail(
	companyId: string,
	email: string,
): Promise<void> {
	await updateDoc(doc(db, 'companies', companyId), {
		authorizedEmails: arrayUnion(email.toLowerCase().trim()),
	});
}

// AUTH-01: Find the company whose authorizedEmails array contains this email.
// Used at driver signup BEFORE creating the Firebase Auth account.
// Single array-contains clause — no composite index needed.
// Returns { id: companyId } if found, null if not authorized.
export async function findCompanyByEmail(
	email: string,
): Promise<{ id: string } | null> {
	const q = query(
		collection(db, 'companies'),
		where('authorizedEmails', 'array-contains', email.toLowerCase().trim()),
	);
	const snapshot = await getDocs(q);
	if (snapshot.empty) return null;
	return { id: snapshot.docs[0].id };
}

// COMP-03: Deactivate a driver by setting isActive: false on their users/{uid} doc.
// Deactivated drivers are excluded from dispatch but remain visible in the roster.
export async function deactivateDriver(driverUid: string): Promise<void> {
	await updateDoc(doc(db, 'users', driverUid), {
		isActive: false,
	});
}

// COMP-04: Real-time listener for all active trips belonging to a company.
// Listens to the 'trips' collection filtered by companyId.
// Status filter: en_route, arrived, in_progress (active jobs only).
// Returns an unsubscribe function — call on component unmount.
// Note: Existing trips without a companyId field will not appear until Phase 2 dispatch populates it.
export function listenToCompanyJobs(
	companyId: string,
	callback: (trips: Trip[]) => void,
): () => void {
	const q = query(
		collection(db, 'trips'),
		where('companyId', '==', companyId),
		where('status', 'in', ['en_route', 'arrived', 'in_progress']),
	);
	return onSnapshot(q, (snapshot) => {
		const trips = snapshot.docs.map((d) => ({
			id: d.id,
			...d.data(),
			startTime: d.data().startTime?.toDate() ?? new Date(),
			arrivalTime: d.data().arrivalTime?.toDate(),
			startedAt: d.data().startedAt?.toDate(),
			completionTime: d.data().completionTime?.toDate(),
		})) as Trip[];
		callback(trips);
	});
}

// COMP-05: Real-time listener for all drivers belonging to a company.
// Listens to both users (name/email) and drivers (availability) collections,
// merging isAvailable into each returned User object.
// Returns an unsubscribe function — call on component unmount.
export function listenToCompanyDrivers(
	companyId: string,
	callback: (drivers: (User & { isAvailable?: boolean })[]) => void,
): () => void {
	let usersData: User[] = [];
	let availabilityMap: Record<string, boolean> = {};

	function merge() {
		const merged = usersData.map((u) => ({
			...u,
			isAvailable: availabilityMap[u.id] ?? false,
		}));
		callback(merged);
	}

	const usersQuery = query(
		collection(db, 'users'),
		where('companyId', '==', companyId),
		where('role', '==', 'driver'),
	);
	const driversQuery = query(
		collection(db, 'drivers'),
		where('companyId', '==', companyId),
	);

	const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
		usersData = snapshot.docs.map((d) => ({
			id: d.id,
			...d.data(),
			createdAt: d.data().createdAt?.toDate() ?? new Date(),
		})) as User[];
		merge();
	});

	const unsubDrivers = onSnapshot(driversQuery, (snapshot) => {
		availabilityMap = {};
		for (const d of snapshot.docs) {
			availabilityMap[d.id] = d.data().isAvailable ?? false;
		}
		merge();
	});

	return () => {
		unsubUsers();
		unsubDrivers();
	};
}

// Re-export Company type for convenient access by consumers of this module
export type { Company };
