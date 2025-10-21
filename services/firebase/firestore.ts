import { addDoc, collection, doc, getDoc, onSnapshot, query, Timestamp, updateDoc, where } from "firebase/firestore";
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

export async function acceptRequest(requestId: string, driverId: string): Promise<string> {
	try {
		await updateDoc(doc(db, 'requests', requestId), {
			status: 'accepted',
			matchedDriverId: driverId
		});

		const requestDoc = await getDoc(doc(db, 'requests', requestId));
		const requestData = requestDoc.data();

		const tripData = {
			requestId: requestId,
      		commuterId: requestData?.commuterId,
      		driverId: driverId,
      		status: 'en_route',
      		pickupLocation: requestData?.location,
      		dropoffLocation: requestData?.dropoffLocation,
      		startTime: Timestamp.now(),
			arrivalTime: null,
			completionTime: null,
			distance: 0,
			estimatedPrice: 75,
			finalPrice: null,
			driverPath: []
		};

		const tripRef = await addDoc(collection(db, 'trips'), tripData);
		console.log('trip created: ', tripRef.id);
		return tripRef.id
	} catch (error) {
		console.error(error);
		throw error;
	}
}

export function listenForRequests(callback: (requests: any[]) => void) {
	const q = query(
		collection(db, 'requests'),
		where('status', '==', 'searching')
	);

	return onSnapshot(q, (snapshot) => {
		const requests = snapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		}));

		callback(requests);
	})
}