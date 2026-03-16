import { useState, useEffect } from 'react';
import { User } from '@/types/models';
import { listenToCompanyDrivers } from '@/services/firebase/companies';

export function useCompanyDrivers(companyId: string | null) {
	const [drivers, setDrivers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!companyId) {
			setLoading(false);
			return;
		}
		const unsubscribe = listenToCompanyDrivers(companyId, (updatedDrivers) => {
			setDrivers(updatedDrivers);
			setLoading(false);
		});
		return () => unsubscribe();
	}, [companyId]);

	return { drivers, loading, error };
}
