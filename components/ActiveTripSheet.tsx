import { updateTripStatus } from '@/services/firebase/firestore';
import { Trip } from '@/types/models';
import { useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Animated,
	Dimensions,
	Linking,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// CHANGING THESE NUMBERS WON'T SHOW IMMEDIATELY, TAP THE HANDLE THEN TAP AGAIN TO SEE THE NEW HEIGHT
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.15;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.75;

const STATUS_LABELS: Record<string, string> = {
	en_route: 'En Route to Pickup',
	arrived: 'Arrived at Pickup',
	in_progress: 'Service in Progress',
	completed: 'Trip Completed',
	cancelled: 'Trip Cancelled',
};
const ACTION_LABELS: Record<string, string> = {
	en_route: "I've Arrived",
	arrived: 'Start Service',
	in_progress: 'Complete Trip',
};

interface ActiveTripSheetProps {
	trip: Trip | null;
	commuterName: string | null;
	commuterPhone: string | null;
}

function ProgressStep({
	label,
	done,
	active,
	subtitle,
}: {
	label: string;
	done: boolean;
	active: boolean;
	subtitle?: string;
}) {
	return (
		<View style={stepStyles.row}>
			<View
				style={[
					stepStyles.dot,
					done && stepStyles.dotDone,
					active && stepStyles.dotActive,
				]}
			/>
			<View style={{ flex: 1 }}>
				<Text style={[stepStyles.label, done && stepStyles.labelDone]}>
					{label}
				</Text>
				{subtitle && <Text style={stepStyles.subtitle}>{subtitle}</Text>}
			</View>
		</View>
	);
}

export function ActiveTripSheet({
	trip,
	commuterName,
	commuterPhone,
}: ActiveTripSheetProps) {
	const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
	const [isExpanded, setIsExpanded] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);

	const handleCall = () => {
		if (!commuterPhone) return;
		Linking.openURL(`tel:${commuterPhone}`).catch(() => {
			Alert.alert('Error', 'Could not open phone dialer');
		});
	};

	const handleSMS = () => {
		if (!commuterPhone) return;
		Linking.openURL(`sms:${commuterPhone}`).catch(() => {
			Alert.alert('Error', 'Could not open messages');
		});
	};

	async function handleStatusUpdate() {
		if (isUpdating) return;
		const NEXT_STATUS = {
			en_route: 'arrived',
			arrived: 'in_progress',
			in_progress: 'completed',
		} as const;
		if (!trip) return;
		try {
			setIsUpdating(true);
			const nextStatus = NEXT_STATUS[trip.status as keyof typeof NEXT_STATUS];
			if (!nextStatus) return;
			await updateTripStatus(trip.id, nextStatus);
		} catch (error: any) {
			setIsUpdating(false);
			Alert.alert('Error', error.message);
		}
	}

	const toggleSheet = () => {
		const toValue = isExpanded ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
		Animated.spring(sheetHeight, {
			toValue,
			useNativeDriver: false,
			tension: 100,
			friction: 12,
		}).start();
		setIsExpanded((prev) => !prev);
	};

	return (
		<Animated.View style={[styles.sheet, { height: sheetHeight }]}>
			<TouchableOpacity onPress={toggleSheet} style={styles.handleContainer}>
				<View style={styles.dragHandle} />
			</TouchableOpacity>
			<View style={styles.statusBadge}>
				<Text style={styles.statusText}>
					{STATUS_LABELS[trip?.status ?? ''] ?? 'Loading...'}
				</Text>
			</View>

			<View style={styles.customerRow}>
				<View style={styles.initialsCircle}>
					<Text style={styles.initialsText}>
						{commuterName
							?.split(' ')
							.map((n) => n[0])
							.join('') ?? '??'}
					</Text>
				</View>
				<Text style={styles.customerName}>{commuterName ?? 'Loading...'}</Text>
				<View style={styles.contactButtons}>
					<TouchableOpacity style={styles.contactButton} onPress={handleCall}>
						<Text>📞</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.contactButton} onPress={handleSMS}>
						<Text>💬</Text>
					</TouchableOpacity>
				</View>
			</View>

			<ScrollView scrollEnabled={isExpanded}>
				<View style={styles.divider} />
				<View style={styles.infoCard}>
					<View style={styles.infoRow}>
						<Text style={styles.infoLabel}>Service</Text>
						<Text style={styles.infoValue}>Towing</Text>
					</View>

					<View style={styles.infoRow}>
						<Text style={styles.infoLabel}>📍 Pickup</Text>
						<Text style={styles.infoValue}>{trip?.pickupAddress ?? '—'}</Text>
					</View>

					<View style={styles.infoRow}>
						<Text style={styles.infoLabel}>🏁 Dropoff</Text>
						<Text style={styles.infoValue}>{trip?.dropoffAddress ?? '—'}</Text>
					</View>

					<View style={styles.divider} />

					<View style={styles.infoRow}>
						<Text style={styles.infoLabel}>Fare</Text>
						<Text style={styles.fareValue}>${trip?.estimatedPrice ?? '—'}</Text>
					</View>
				</View>

				<View style={styles.progressSteps}>
					<ProgressStep
						label="Drive to Pickup"
						done={['arrived', 'in_progress', 'completed'].includes(
							trip?.status ?? '',
						)}
						active={trip?.status === 'en_route'}
						subtitle={trip?.pickupAddress}
					/>
					<ProgressStep
						label="Provide Service"
						done={['in_progress', 'completed'].includes(trip?.status ?? '')}
						active={trip?.status === 'arrived'}
						subtitle="Towing"
					/>
					<ProgressStep
						label="Complete Drop-off"
						done={trip?.status === 'completed'}
						active={trip?.status === 'in_progress'}
						subtitle={trip?.dropoffAddress}
					/>
				</View>

				{ACTION_LABELS[trip?.status ?? ''] && (
					<TouchableOpacity
						style={[
							styles.actionButton,
							isUpdating && styles.actionButtonDisabled,
						]}
						onPress={handleStatusUpdate}
						disabled={isUpdating}
					>
						{isUpdating ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.actionButtonText}>
								{ACTION_LABELS[trip?.status ?? '']}
							</Text>
						)}
					</TouchableOpacity>
				)}
			</ScrollView>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	sheet: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: 'white',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		overflow: 'hidden',
	},
	handleContainer: {
		alignItems: 'center',
		paddingVertical: 12,
	},
	dragHandle: {
		width: 40,
		height: 4,
		backgroundColor: '#CCCCCC',
		borderRadius: 2,
	},
	statusBadge: {
		alignSelf: 'flex-start',
		marginHorizontal: 20,
		marginBottom: 8,
		backgroundColor: '#E8F5E9',
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#2E7D32',
	},
	customerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingBottom: 16,
		gap: 12,
	},
	initialsCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#E0E0E0',
		justifyContent: 'center',
		alignItems: 'center',
	},
	initialsText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#333',
	},
	customerName: {
		flex: 1,
		fontSize: 18,
		fontWeight: '700',
		color: '#000',
	},
	divider: {
		height: 1,
		backgroundColor: '#E0E0E0',
		marginHorizontal: 20,
		marginVertical: 12,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		paddingHorizontal: 20,
		paddingVertical: 20,
	},
	infoLabel: {
		fontSize: 14,
		color: '#666666',
		flex: 1,
	},
	infoValue: {
		fontSize: 14,
		color: '#000',
		fontWeight: '500',
		flex: 2,
		textAlign: 'right',
	},
	fareValue: {
		fontSize: 21,
		fontWeight: '700',
		color: '#34C759',
		flex: 2,
		textAlign: 'right',
	},
	infoCard: {
		backgroundColor: '#F8F8F8',
		marginHorizontal: 16,
		marginTop: 8,
		borderRadius: 12,
		overflow: 'hidden',
	},
	contactButtons: {
		flexDirection: 'row',
		gap: 8,
		marginLeft: 'auto',
	},
	contactButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#F0F0F0',
		justifyContent: 'center',
		alignItems: 'center',
	},
	progressSteps: {
		marginHorizontal: 16,
		marginTop: 16,
		padding: 16,
		backgroundColor: '#F8F8F8',
		borderRadius: 12,
	},
	actionButton: {
		backgroundColor: '#34C759',
		marginHorizontal: 16,
		marginTop: 16,
		marginBottom: 32,
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
	},
	actionButtonDisabled: {
		opacity: 0.6,
	},
	actionButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '700',
	},
});

const stepStyles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 6,
	},
	dot: {
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: '#E0E0E0',
		borderWidth: 2,
		borderColor: '#E0E0E0',
	},
	dotActive: { backgroundColor: '#34C759', borderColor: '#34C759' },
	dotDone: { backgroundColor: '#A5D6A7', borderColor: '#A5D6A7' },
	label: { fontSize: 14, color: '#999' },
	labelDone: { color: '#333' },
	subtitle: {
		fontSize: 12,
		color: '#888',
		marginTop: 2,
	},
});
