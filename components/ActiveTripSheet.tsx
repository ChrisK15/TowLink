import { Trip } from '@/types/models';
import { useRef, useState } from 'react';
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
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.15;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.8;
const STATUS_LABELS: Record<string, string> = {
	en_route: 'En Route to Pickup',
	arrived: 'Arrived at Pickup',
	in_progress: 'Service in Progress',
	completed: 'Trip Completed',
	cancelled: 'Trip Cancelled',
};

interface ActiveTripSheetProps {
	trip: Trip | null;
	commuterName: string | null;
	commuterPhone: string | null;
}

export function ActiveTripSheet({
	trip,
	commuterName,
	commuterPhone,
}: ActiveTripSheetProps) {
	const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
	const [isExpanded, setIsExpanded] = useState(false);

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
});
