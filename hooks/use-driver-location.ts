import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase/config';

export function useDriverLocation(driverId: string | null) {
	const [driverLocation, setDriverLocation] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);

	useEffect(() => {
		if (!driverId) {
			setDriverLocation(null);
			return;
		}
		const unsub = onSnapshot(doc(db, 'drivers', driverId), (snap) => {
			if (snap.exists()) {
				const data = snap.data();
				setDriverLocation(data.currentLocation ?? null);
			}
		});
		return unsub;
	}, [driverId]);

	return driverLocation;
}
