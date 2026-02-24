import { Trip } from '@/types/models';
import { useRef, useState } from 'react';
import {
	Animated,
	Dimensions,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.15;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.8;

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
});
