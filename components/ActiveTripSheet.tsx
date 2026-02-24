import { Trip } from '@/types/models';
import { useRef, useState } from 'react';
import {
	Animated,
	Dimensions,
	Modal,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.2;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.9;

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
		<Modal
			visible={true}
			transparent={true}
			animationType="slide"
			onRequestClose={() => {}}
		>
			<View style={styles.container}>
				<Animated.View style={[styles.sheet, { height: sheetHeight }]}>
					<TouchableOpacity
						onPress={toggleSheet}
						style={styles.handleContainer}
					>
						<View style={styles.dragHandle} />
					</TouchableOpacity>
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	sheet: {
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
