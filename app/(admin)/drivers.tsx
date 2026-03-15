import React from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { useCompanyDrivers } from '@/hooks/use-company-drivers';

export default function AdminDriversScreen() {
	const { companyId } = useAuth();
	const { drivers, loading } = useCompanyDrivers(companyId);

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#007AFF" />
			</View>
		);
	}

	return (
		<View style={styles.center}>
			<Text style={styles.text}>Drivers Tab — {drivers.length} drivers</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	text: { fontSize: 16, color: '#000' },
});
