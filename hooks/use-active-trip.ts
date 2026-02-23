import { useState, useEffect, useRef } from 'react';
import { Trip } from '@/types/models';
import { listenToTrip, getRequestById } from '@/services/firebase/firestore';

export function useActiveTrip(tripId: string | null) {
	const [trip, setTrip] = useState<Trip | null>(null);
	const [commuterName, setCommuterName] = useState<string | null>(null);
	const [commuterPhone, setCommuterPhone] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const commuterFetchedRef = useRef(false);

	useEffect(() => {
		if (!tripId) return;
		const unsubscribe = listenToTrip(tripId, async (updatedTrip) => {
			if (!updatedTrip) {
				setError('Trip not found');
				return;
			}
			setTrip(updatedTrip);
			setLoading(false);
			if (!commuterFetchedRef.current) {
				commuterFetchedRef.current = true;
				const request = await getRequestById(updatedTrip.requestId);
				setCommuterName(request?.commuterName ?? null);
				setCommuterPhone(request?.commuterPhone ?? null);
			}
		});
		return () => unsubscribe();
	}, [tripId]);

	return { trip, commuterName, commuterPhone, loading, error };
}
