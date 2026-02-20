import { listenForClaimedRequests } from '@/services/firebase/firestore';
import { Request } from '@/types/models';
import { useEffect, useRef, useState } from 'react';

export function useClaimedRequest(driverId: string | null, isOnline: boolean) {
	const [claimedRequest, setClaimedRequest] = useState<Request | null>(null);
	const unsubscribeRef = useRef<(() => void) | null>(null);

	useEffect(() => {
		if (driverId && isOnline) {
			const unsubscribe = listenForClaimedRequests(driverId, (request) => {
				setClaimedRequest(request);
			});
			unsubscribeRef.current = unsubscribe;
		} else {
			if (unsubscribeRef) {
				unsubscribeRef.current?.();
				setClaimedRequest(null);
			}
		}
		return () => {
			unsubscribeRef.current?.();
		};
	}, [driverId, isOnline]);
	const isListening = unsubscribeRef.current !== null;
	return { claimedRequest, isListening };
}
