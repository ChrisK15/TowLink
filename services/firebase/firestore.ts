import { Location } from '@/types/models';
import {
	addDoc,
	arrayUnion,
	collection,
	doc,
	getDoc,
	onSnapshot,
	query,
	runTransaction,
	Timestamp,
	updateDoc,
	where,
} from 'firebase/firestore';
import { getGeohash } from '../geoLocationUtils';
import { db } from './config';

export async function createRequest(
	commuterId: string,
	pickupLocation: Location,
	dropoffLocation: Location,
	pickupAddress: string,
	dropoffAddress: string,
): Promise<string> {
	if (pickupLocation.latitude === 0 && pickupLocation.longitude === 0) {
		throw new Error('Invalid pickup location.');
	}
	if (dropoffLocation.latitude === 0 && dropoffLocation.longitude === 0) {
		throw new Error('Invalid dropoff location.');
	}
	if (Math.abs(pickupLocation.latitude) > 90) {
		throw new Error('Invalid pickup latitude range.');
	}
	if (Math.abs(pickupLocation.longitude) > 180) {
		throw new Error('Invalid pickup longitude range.');
	}
	if (Math.abs(dropoffLocation.latitude) > 90) {
		throw new Error('Invalid dropoff latitude range.');
	}
	if (Math.abs(dropoffLocation.longitude) > 180) {
		throw new Error('Invalid dropoff longitude range.');
	}

	const requestData = {
		commuterId: commuterId,
		location: pickupLocation,
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

export async function updateDriverAvailability(
	driverId: string,
	isAvailable: boolean,
	currentLocation?: Location,
): Promise<void> {
	try {
		await updateDoc(doc(db, 'drivers', driverId), {
			isAvailable: isAvailable,
			updatedAt: Timestamp.now(),
			currentLocation: currentLocation ? currentLocation : null,
			geohash: currentLocation
				? getGeohash(currentLocation.latitude, currentLocation.longitude)
				: null,
		});

		console.log('Driver status updated: ', isAvailable);
	} catch (error) {
		console.error(error);
		throw error;
	}
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

export async function claimRequest(
	requestId: string,
	driverId: string,
): Promise<void> {
	await runTransaction(db, async (transaction) => {
		const docRef = doc(db, 'requests', requestId);
		const docSnapshot = await transaction.get(docRef);
		const data = docSnapshot.data();
		if (!data) {
			throw new Error(`Request ${requestId} not found`);
		}
		if (data.status !== 'searching') {
			throw new Error(`Request ${requestId} already ${data.status}`);
		}
		transaction.update(docRef, {
			status: 'claimed',
			claimedByDriverId: driverId,
			claimExpiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 1000)),
			notifiedDriverIds: arrayUnion(driverId),
		});
	});
}

export async function acceptClaimedRequest(
	requestId: string,
	driverId: string,
): Promise<string> {
	await runTransaction(db, async (transaction) => {
		const docRef = doc(db, 'requests', requestId);
		const docSnapshot = await transaction.get(docRef);
		const data = docSnapshot.data();
		if (!data) {
			throw new Error(`Request ${requestId} not found`);
		}
		if (data.status !== 'claimed') {
			throw new Error(`Request ${requestId} already ${data.status}.`);
		}
		if (data.claimedByDriverId !== driverId) {
			throw new Error(`Request ${requestId} claimed by another driver.`);
		}
		if (data.claimExpiresAt.toDate() < new Date()) {
			throw new Error(`Request ${requestId} expired.`);
		}
		transaction.update(docRef, {
			status: 'accepted',
			matchedDriverId: driverId,
		});
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
}

export async function declineClaimedRequest(
	requestId: string,
	driverId: string,
): Promise<void> {
	await runTransaction(db, async (transaction) => {
		const docRef = doc(db, 'requests', requestId);
		const docSnapshot = await transaction.get(docRef);
		const data = docSnapshot.data();
		if (!data) {
			throw new Error(`Request ${requestId} not found`);
		}
		if (data.status !== 'claimed') {
			throw new Error(`Request ${requestId} already ${data.status}.`);
		}
		if (data.claimedByDriverId !== driverId) {
			throw new Error(`Request ${requestId} claimed by another driver.`);
		}
		transaction.update(docRef, {
			status: 'searching',
			claimedByDriverId: null,
			claimExpiresAt: null,
		});
	});
}
