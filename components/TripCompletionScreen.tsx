import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
	Animated,
	Modal,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { Trip } from '@/types/models';

interface TripCompletionScreenProps {
	visible: boolean;
	role: 'driver' | 'commuter';
	trip: Trip;
	otherPartyName: string | null;
	onDone: () => void;
}

function formatDuration(trip: Trip): string {
	const end = trip.completionTime;
	const start = trip.startedAt ?? trip.startTime;
	if (!end || !start) return '—';
	const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
	if (minutes < 60) return `${minutes} min`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface SummaryRowProps {
	label: string;
	value: string;
	numberOfLines?: number;
}

function SummaryRow({ label, value, numberOfLines }: SummaryRowProps) {
	return (
		<View style={styles.summaryRow}>
			<Text style={styles.summaryLabel}>{label}</Text>
			<Text
				style={styles.summaryValue}
				numberOfLines={numberOfLines}
				ellipsizeMode="tail"
			>
				{value}
			</Text>
		</View>
	);
}

export function TripCompletionScreen({
	visible,
	role,
	trip,
	otherPartyName,
	onDone,
}: TripCompletionScreenProps) {
	const scaleAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		if (visible) {
			scaleAnim.setValue(0);
			Animated.spring(scaleAnim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 200,
				friction: 8,
			}).start();
		}
	}, [visible, scaleAnim]);

	const title = role === 'driver' ? 'Job Complete!' : 'Trip Complete!';
	const otherPartyLabel = role === 'driver' ? 'Customer' : 'Driver';
	const otherPartyDisplay = otherPartyName ?? '—';
	const fareDisplay = trip.estimatedPrice ? `$${trip.estimatedPrice}` : '—';
	const durationDisplay = formatDuration(trip);

	return (
		<Modal
			visible={visible}
			animationType="fade"
			onRequestClose={onDone}
			statusBarTranslucent
		>
			<View style={styles.container}>
				<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
					<Ionicons name="checkmark-circle" size={80} color="#34C759" />
				</Animated.View>

				<Text style={styles.title}>{title}</Text>

				<Text style={styles.otherPartyName}>
					{otherPartyLabel}: {otherPartyDisplay}
				</Text>

				<View style={styles.card}>
					<SummaryRow label="Estimated Fare" value={fareDisplay} />
					<View style={styles.divider} />
					<SummaryRow label="Pickup" value={trip.pickupAddress || '—'} numberOfLines={2} />
					<View style={styles.divider} />
					<SummaryRow label="Dropoff" value={trip.dropoffAddress || '—'} numberOfLines={2} />
					<View style={styles.divider} />
					<SummaryRow label="Duration" value={durationDisplay} />
				</View>

				<TouchableOpacity style={styles.doneButton} onPress={onDone}>
					<Text style={styles.doneButtonText}>Done</Text>
				</TouchableOpacity>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#000000',
		marginTop: 24,
	},
	otherPartyName: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#000000',
		marginTop: 8,
	},
	card: {
		marginTop: 32,
		width: '100%',
		backgroundColor: '#F5F5F5',
		borderRadius: 12,
		padding: 16,
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		paddingVertical: 12,
	},
	summaryLabel: {
		fontSize: 14,
		color: '#666666',
	},
	summaryValue: {
		fontSize: 15,
		color: '#000000',
		flex: 1,
		textAlign: 'right',
		marginLeft: 16,
	},
	divider: {
		height: 1,
		backgroundColor: '#E0E0E0',
	},
	doneButton: {
		marginTop: 32,
		width: '100%',
		backgroundColor: '#1565C0',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
	},
	doneButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#FFFFFF',
	},
});
