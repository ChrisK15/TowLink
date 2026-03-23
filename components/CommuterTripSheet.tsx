import { useCommuterTrip } from '@/hooks/use-commuter-trip';
import { updateTripStatus } from '@/services/firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
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
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.11;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.75;

const STATUS_BANNER_TEXT: Record<string, string> = {
	en_route: 'Driver en route to your location',
	arrived: 'Driver has arrived',
	in_progress: 'Service in progress',
	completed: 'Trip completed',
	cancelled: 'Trip cancelled',
};

interface CommuterTripSheetProps {
	tripId: string;
	onTripCompleted: () => void;
	eta: string | null;
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
	const scaleAnim = useRef(new Animated.Value(done ? 1 : 0)).current;

	useEffect(() => {
		if (done) {
			Animated.spring(scaleAnim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 200,
				friction: 8,
			}).start();
		}
	}, [done]);

	return (
		<View style={stepStyles.row}>
			{done ? (
				<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
					<Ionicons name="checkmark-circle" size={20} color="#1565C0" />
				</Animated.View>
			) : (
				<View style={[stepStyles.dot, active && stepStyles.dotActive]} />
			)}
			<View style={{ flex: 1 }}>
				<Text
					style={[
						stepStyles.label,
						done && stepStyles.labelDone,
						active && stepStyles.labelActive,
					]}
				>
					{label}
				</Text>
				{subtitle && <Text style={stepStyles.subtitle}>{subtitle}</Text>}
			</View>
		</View>
	);
}

export function CommuterTripSheet({
	tripId,
	onTripCompleted,
	eta,
}: CommuterTripSheetProps) {
	const { trip, driverName, driverPhone, driverVehicle } =
		useCommuterTrip(tripId);

	const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
	const [isExpanded, setIsExpanded] = useState(false);

	// Pulsing blue dot animation
	const pulseAnim = useRef(new Animated.Value(0.8)).current;
	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.2,
					duration: 700,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 0.8,
					duration: 700,
					useNativeDriver: true,
				}),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [pulseAnim]);

	// Fire onTripCompleted when trip finishes or is cancelled
	useEffect(() => {
		if (trip?.status === 'completed' || trip?.status === 'cancelled') {
			onTripCompleted();
		}
	}, [trip?.status]);

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

	const handleCall = () => {
		if (!driverPhone) return;
		Linking.openURL(`tel:${driverPhone}`).catch(() =>
			Alert.alert('Error', 'Could not open phone dialer'),
		);
	};

	const handleSMS = () => {
		if (!driverPhone) return;
		Linking.openURL(`sms:${driverPhone}`).catch(() =>
			Alert.alert('Error', 'Could not open messages'),
		);
	};

	const handleCancelTrip = () => {
		Alert.alert('Cancel Trip', 'Are you sure you want to cancel this trip?', [
			{ text: 'No', style: 'cancel' },
			{
				text: 'Yes, Cancel',
				style: 'destructive',
				onPress: async () => {
					try {
						await updateTripStatus(tripId, 'cancelled');
					} catch (error: any) {
						Alert.alert('Error', error.message);
					}
				},
			},
		]);
	};

	const initials =
		driverName
			?.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) ?? '??';

	const steps = [
		{
			label: 'Driver en route to your location',
			done: ['arrived', 'in_progress', 'completed'].includes(
				trip?.status ?? '',
			),
			active: trip?.status === 'en_route',
			subtitle: trip?.pickupAddress ?? '',
		},
		{
			label: 'Driver arrived',
			done: ['in_progress', 'completed'].includes(trip?.status ?? ''),
			active: trip?.status === 'arrived',
			subtitle: 'Waiting to start service',
		},
		{
			label: 'Service in progress',
			done: trip?.status === 'completed',
			active: trip?.status === 'in_progress',
			subtitle: 'Estimated 15-20 minutes',
		},
		{
			label: 'Complete',
			done: trip?.status === 'completed',
			active: false,
			subtitle: 'Rate your experience',
		},
	];

	return (
		<Animated.View style={[styles.sheet, { height: sheetHeight }]}>
			{/* Drag handle */}
			<TouchableOpacity onPress={toggleSheet} style={styles.handleContainer}>
				<View style={styles.dragHandle} />
			</TouchableOpacity>

			{/* Status banner */}
			<View style={styles.statusBanner}>
				<View style={styles.statusLeft}>
					<Animated.View
						style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]}
					/>
					<View>
						<Text style={styles.statusText}>
							{STATUS_BANNER_TEXT[trip?.status ?? ''] ?? 'Loading...'}
						</Text>
						<Text style={styles.etaText}>{eta ? `${eta}` : '-- min away'}</Text>
					</View>
				</View>
				<View style={styles.liveBadge}>
					<Text style={styles.liveBadgeText}>Live</Text>
				</View>
			</View>

			{/* Driver info row */}
			<View style={styles.driverRow}>
				<View style={styles.initialsCircle}>
					<Text style={styles.initialsText}>{initials}</Text>
				</View>
				<Text style={styles.driverName}>{driverName ?? 'Loading...'}</Text>
				<View style={styles.contactButtons}>
					{driverPhone && (
						<>
							<TouchableOpacity
								style={styles.contactButton}
								onPress={handleSMS}
							>
								<Ionicons name="chatbubble-outline" size={18} color="#333" />
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.contactButton}
								onPress={handleCall}
							>
								<Ionicons name="call-outline" size={18} color="#333" />
							</TouchableOpacity>
						</>
					)}
				</View>
			</View>

			<ScrollView scrollEnabled={isExpanded}>
				{/* Vehicle card */}
				{driverVehicle && (
					<View style={styles.vehicleCard}>
						<View style={styles.vehicleColumn}>
							<Text style={styles.vehicleLabel}>Vehicle</Text>
							<Text style={styles.vehicleValue}>
								{driverVehicle.year} {driverVehicle.make} {driverVehicle.model}
							</Text>
						</View>
						<View style={styles.vehicleColumn}>
							<Text style={styles.vehicleLabel}>License</Text>
							<Text style={styles.vehicleValue}>
								{driverVehicle.licensePlate}
							</Text>
						</View>
					</View>
				)}

				{/* Progress steps */}
				<View style={styles.progressSteps}>
					{steps.map((step) => (
						<ProgressStep key={step.label} {...step} />
					))}
				</View>

				{/* Safety banner */}
				<View style={styles.safetyBanner}>
					<Ionicons
						name="information-circle-outline"
						size={20}
						color="#1565C0"
						style={{ marginRight: 8 }}
					/>
					<View style={{ flex: 1 }}>
						<Text style={styles.safetyTitle}>Safety First</Text>
						<Text style={styles.safetyBody}>
							Stay in a safe location and keep your phone on. The driver will
							contact you when nearby.
						</Text>
					</View>
				</View>

				{/* Cancel trip button */}
				<TouchableOpacity
					style={styles.cancelButton}
					onPress={handleCancelTrip}
				>
					<Text style={styles.cancelButtonText}>Cancel Trip</Text>
				</TouchableOpacity>
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
	statusBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginHorizontal: 16,
		marginBottom: 12,
		backgroundColor: '#EEF4FF',
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	statusLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		flex: 1,
	},
	statusDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#1565C0',
	},
	statusText: {
		fontSize: 12,
		color: '#1565C0',
		fontWeight: '500',
	},
	etaText: {
		fontSize: 20,
		fontWeight: '700',
		color: '#000',
	},
	liveBadge: {
		backgroundColor: '#D6E4FF',
		borderRadius: 20,
		paddingHorizontal: 10,
		paddingVertical: 4,
	},
	liveBadgeText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#1565C0',
	},
	driverRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 12,
		gap: 12,
	},
	initialsCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#1565C0',
		justifyContent: 'center',
		alignItems: 'center',
	},
	initialsText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#FFF',
	},
	driverName: {
		flex: 1,
		fontSize: 17,
		fontWeight: '700',
		color: '#000',
	},
	contactButtons: {
		flexDirection: 'row',
		gap: 8,
	},
	contactButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: '#F0F0F0',
		justifyContent: 'center',
		alignItems: 'center',
	},
	vehicleCard: {
		flexDirection: 'row',
		marginHorizontal: 16,
		marginBottom: 12,
		backgroundColor: '#F8F8F8',
		borderRadius: 12,
		padding: 14,
	},
	vehicleColumn: {
		flex: 1,
	},
	vehicleLabel: {
		fontSize: 12,
		color: '#888',
		marginBottom: 4,
	},
	vehicleValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#000',
	},
	progressSteps: {
		marginHorizontal: 16,
		marginBottom: 12,
		padding: 14,
		backgroundColor: '#F8F8F8',
		borderRadius: 12,
	},
	safetyBanner: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginHorizontal: 16,
		marginBottom: 12,
		backgroundColor: '#E3F2FD',
		borderRadius: 12,
		padding: 14,
	},
	safetyTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1565C0',
		marginBottom: 4,
	},
	safetyBody: {
		fontSize: 13,
		color: '#444',
		lineHeight: 18,
	},
	cancelButton: {
		backgroundColor: '#FF3B30',
		marginHorizontal: 16,
		marginBottom: 32,
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
	},
	cancelButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: '700',
	},
});

const stepStyles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'flex-start',
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
		marginTop: 2,
	},
	dotActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
	label: { fontSize: 14, color: '#999' },
	labelDone: { color: '#333' },
	labelActive: { color: '#333', fontWeight: '600' },
	subtitle: {
		fontSize: 12,
		color: '#888',
		marginTop: 2,
	},
});
