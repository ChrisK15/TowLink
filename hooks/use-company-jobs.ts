import { useState, useEffect } from 'react';
import { Trip } from '@/types/models';
import { listenToCompanyJobs } from '@/services/firebase/companies';

export function useCompanyJobs(companyId: string | null) {
	const [jobs, setJobs] = useState<Trip[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!companyId) {
			setLoading(false);
			return;
		}
		const unsubscribe = listenToCompanyJobs(companyId, (updatedJobs) => {
			setJobs(updatedJobs);
			setLoading(false);
		});
		return () => unsubscribe();
	}, [companyId]);

	return { jobs, loading, error };
}
