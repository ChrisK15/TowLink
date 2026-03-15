import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { useCompanyJobs } from '@/hooks/use-company-jobs';

export default function AdminJobsScreen() {
	const { companyId, loading: authLoading } = useAuth();
	const { jobs, loading } = useCompanyJobs(companyId);
	const { replace } = useRouter();

	useEffect(() => {
		if (!authLoading && companyId === null) {
			replace('/(admin)/company-setup');
		}
	}, [companyId, authLoading]);

	if (loading || authLoading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#007AFF" />
			</View>
		);
	}

	return (
		<View style={styles.center}>
			<Text style={styles.text}>Jobs Tab — {jobs.length} active jobs</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	text: { fontSize: 16, color: '#000' },
});
