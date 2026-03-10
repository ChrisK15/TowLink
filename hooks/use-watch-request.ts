import { useState, useEffect } from 'react';
import { Request } from '@/types/models';
import { listenToRequest } from '@/services/firebase/firestore';

export function useWatchRequest(requestId: string | null) {
	const [request, setRequest] = useState<Request | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!requestId) {
			setLoading(false);
			return;
		}
		const unsubscribe = listenToRequest(requestId, (updatedRequest) => {
			if (!updatedRequest) {
				setError('Request not found');
				setLoading(false);
				return;
			}
			setRequest(updatedRequest);
			setLoading(false);
		});
		return () => unsubscribe();
	}, [requestId]);

	return { request, loading, error };
}
