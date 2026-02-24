import { Trip } from '@/types/models';
import { useRef, useState } from 'react';
import {
	Animated,
	Dimensions,
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
			</View>
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
		fontSize: 18,
		fontWeight: '700',
		color: '#000',
	},
});
