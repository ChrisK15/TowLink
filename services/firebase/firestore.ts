import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from './config';

export async function createRequest(
	commuterId: string,
	pickupAddress: string,
	dropoffAddress: string
) {
	const requestData = {
		commuterId: commuterId,
		location: { latitude: 0, longitude: 0 },
		dropoffLocation: { latitude: 0, longitude: 0 },
		address: pickupAddress,
		serviceType: 'tow',
		status: 'searching',
		matchedDriverId: null,
		createdAt: Timestamp.now(),
		expiresAt: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000))
	};

	const docRef = await addDoc(
		collection(db, 'requests'),
		requestData
	);

	return docRef.id;
}