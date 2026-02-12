import {
	addDoc,
	collection,
	doc,
	getDoc,
	onSnapshot,
	query,
	Timestamp,
	updateDoc,
	where,
} from 'firebase/firestore';
import { db } from './config';

export async function createRequest(
	commuterId: string,
	pickupAddress: string,
	dropoffAddress: string,
	pickupLocation: Location,
	dropoffLocation: Location,
) {
	const requestData = {
		commuterId: commuterId,
		pickupLocation: pickupLocation,
		dropoffLocation: dropoffLocation,
		pickupAddress: pickupAddress,
		dropoffAddress: dropoffAddress,
		serviceType: 'tow',
		status: 'searching',
		matchedDriverId: null,
		createdAt: Timestamp.now(),
		expiresAt: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
	};

	const docRef = await addDoc(collection(db, 'requests'), requestData);

	return docRef.id;
}

export async function acceptRequest(
	requestId: string,
	driverId: string,
): Promise<string> {
	try {
		await updateDoc(doc(db, 'requests', requestId), {
			status: 'accepted',
			matchedDriverId: driverId,
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
			driverPath: [],
		};

		const tripRef = await addDoc(collection(db, 'trips'), tripData);
		console.log('trip created: ', tripRef.id);
		return tripRef.id;
	} catch (error) {
		console.error(error);
		throw error;
	}
}

export async function updateTripStatus(
	tripId: string,
	status: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled',
): Promise<void> {
	try {
		if (status === 'arrived') {
			await updateDoc(doc(db, 'trips', tripId), {
				status: status,
				arrivalTime: Timestamp.now(),
			});
		} else if (status === 'completed') {
			await updateDoc(doc(db, 'trips', tripId), {
				status: status,
				completionTime: Timestamp.now(),
			});
		} else {
			await updateDoc(doc(db, 'trips', tripId), {
				status: status,
			});
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
}

export function listenForRequests(callback: (requests: any[]) => void) {
	const q = query(
		collection(db, 'requests'),
		where('status', '==', 'searching'),
	);

	return onSnapshot(q, (snapshot) => {
		const requests = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		}));

		callback(requests);
	});
}
