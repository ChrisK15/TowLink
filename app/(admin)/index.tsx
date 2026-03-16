import React from 'react';
import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { signOut } from '@/services/firebase/authService';
import { useCompanyJobs } from '@/hooks/use-company-jobs';
import { Trip } from '@/types/models';

// Status badge configuration per UI-SPEC
const STATUS_CONFIG: Record<
	Trip['status'],
	{ bg: string; color: string; label: string }
> = {
	en_route: { bg: '#F3E5F5', color: '#6A1B9A', label: 'En Route' },
	arrived: { bg: '#E8F5E9', color: '#2E7D32', label: 'Arrived' },
	in_progress: { bg: '#E8F5E9', color: '#2E7D32', label: 'In Progress' },
	completed: { bg: '#F5F5F5', color: '#666666', label: 'Completed' },
	cancelled: { bg: '#FFEBEE', color: '#C62828', label: 'Cancelled' },
};

function StatusBadge({ status }: { status: Trip['status'] }) {
	const config = STATUS_CONFIG[status] ?? {
		bg: '#F5F5F5',
		color: '#666666',
		label: status,
	};
	return (
		<View
			style={[
				styles.badge,
				{ backgroundColor: config.bg },
			]}
		>
			<Text style={[styles.badgeText, { color: config.color }]}>
				{config.label}
			</Text>
		</View>
	);
}

function JobRow({ item }: { item: Trip }) {
	const commuterLabel = `User ${item.commuterId.slice(0, 8)}`;
	const driverLabel = item.driverId
		? `Driver ${item.driverId.slice(0, 8)}`
		: 'Unassigned';
	const driverStyle = item.driverId ? styles.driverName : styles.driverUnassigned;

	return (
		<View style={styles.row}>
			{/* Left: status badge — primary visual anchor */}
			<StatusBadge status={item.status} />

			{/* Middle: commuter identifier + pickup address */}
			<View style={styles.rowMiddle}>
				<Text style={styles.commuterName} numberOfLines={1}>
					{commuterLabel}
				</Text>
				<Text style={styles.pickupAddress} numberOfLines={1}>
					{item.pickupAddress}
				</Text>
			</View>

			{/* Right: driver identifier or Unassigned */}
			<Text style={driverStyle} numberOfLines={1}>
				{driverLabel}
			</Text>
		</View>
	);
}

function EmptyState() {
	return (
		<View style={styles.emptyContainer}>
			<Text style={styles.emptyHeading}>No active jobs</Text>
			<Text style={styles.emptyBody}>
				Jobs will appear here when commuters submit requests.
			</Text>
		</View>
	);
}

export default function AdminJobsScreen() {
	const { top } = useSafeAreaInsets();
	const { companyId, loading: authLoading } = useAuth();
	const { jobs, loading } = useCompanyJobs(companyId);

	if (authLoading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#007AFF" />
			</View>
		);
	}

	if (!companyId) {
		return <Redirect href="/(admin)/company-setup" />;
	}

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#007AFF" />
			</View>
		);
	}

	return (
		<View style={styles.screen}>
			{/* Screen header */}
			<View style={[styles.header, { paddingTop: top + 16 }]}>
				<Text style={styles.headerTitle}>Jobs</Text>
				<TouchableOpacity onPress={signOut}>
					<Text style={styles.signOutText}>Sign Out</Text>
				</TouchableOpacity>
			</View>

			{/* Job list */}
			<FlatList
				data={jobs}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <JobRow item={item} />}
				ListEmptyComponent={<EmptyState />}
				contentContainerStyle={jobs.length === 0 ? styles.listEmptyContent : undefined}
				style={styles.list}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#F5F5F5',
	},

	// Header
	header: {
		flexDirection: 'row' as const,
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
		backgroundColor: '#F5F5F5',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000000',
	},
	signOutText: {
		fontSize: 14,
		color: '#007AFF',
	},

	// List
	list: {
		flex: 1,
		backgroundColor: '#F5F5F5',
	},
	listEmptyContent: {
		flex: 1,
	},

	// Job row
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 12,
		minHeight: 64,
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
	},
	rowMiddle: {
		flex: 1,
		marginHorizontal: 8,
	},
	commuterName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#000000',
	},
	pickupAddress: {
		fontSize: 14,
		fontWeight: '400',
		color: '#666666',
		marginTop: 2,
	},
	driverName: {
		fontSize: 14,
		fontWeight: '400',
		color: '#666666',
		maxWidth: 100,
		textAlign: 'right',
	},
	driverUnassigned: {
		fontSize: 14,
		fontWeight: '400',
		color: '#999999',
		maxWidth: 100,
		textAlign: 'right',
	},

	// Status badge pill
	badge: {
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	badgeText: {
		fontSize: 12,
		fontWeight: '600',
	},

	// Loading
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F5F5F5',
	},

	// Empty state
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
	},
	emptyHeading: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000000',
		textAlign: 'center',
	},
	emptyBody: {
		fontSize: 14,
		fontWeight: '400',
		color: '#666666',
		textAlign: 'center',
		marginTop: 8,
	},
});
