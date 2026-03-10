import { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Trip, VehicleInfo } from '@/types/models';
import { listenToTrip } from '@/services/firebase/firestore';
import { db } from '@/services/firebase/config';

export function useCommuterTrip(tripId: string | null) {
	const [trip, setTrip] = useState<Trip | null>(null);
	const [driverName, setDriverName] = useState<string | null>(null);
	const [driverPhone, setDriverPhone] = useState<string | null>(null);
	const [driverVehicle, setDriverVehicle] = useState<VehicleInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const driverFetchedRef = useRef(false);

	useEffect(() => {
		if (!tripId) {
			setLoading(false);
			return;
		}
		const unsubscribe = listenToTrip(tripId, async (updatedTrip) => {
			if (!updatedTrip) {
				setError('Trip not found');
				setLoading(false);
				return;
			}
			setTrip(updatedTrip);
			setLoading(false);

			if (!driverFetchedRef.current) {
				driverFetchedRef.current = true;
				const [userSnap, driverSnap] = await Promise.all([
					getDoc(doc(db, 'users', updatedTrip.driverId)),
					getDoc(doc(db, 'drivers', updatedTrip.driverId)),
				]);
				if (userSnap.exists()) {
					const userData = userSnap.data();
					setDriverName(userData.name ?? null);
					setDriverPhone(userData.phone ?? null);
				}
				if (driverSnap.exists()) {
					const driverData = driverSnap.data();
					setDriverVehicle(driverData.vehicleInfo ?? null);
				}
			}
		});
		return () => unsubscribe();
	}, [tripId]);

	return { trip, driverName, driverPhone, driverVehicle, loading, error };
}
