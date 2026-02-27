import { ServiceType } from '@/types/models';
import {
	Dimensions,
	Modal,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';

export interface ServiceOption {
	id: ServiceType;
	label: string;
	icon: string;
	priceRange: string;
	description: string;
	isEnabled: boolean;
}

interface RequestServiceSheetProps {
	visible: boolean;
	onClose: () => void;
	onContinue: (serviceType: ServiceType) => void;
}

const SHEET_HEIGHT = Dimensions.get('window').height * 0.95;
const SERVICE_OPTIONS: ServiceOption[] = [
	{
		id: 'tow',
		label: 'Towing',
		icon: '🚚',
		priceRange: '$75 - $120',
		description: 'Vehicle towed to your destination',
		isEnabled: true,
	},
	{
		id: 'jump_start',
		label: 'Jump Start',
		icon: '⚡',
		priceRange: 'Coming Soon',
		description: 'Battery jump start service',
		isEnabled: false,
	},
	{
		id: 'fuel_delivery',
		label: 'Fuel Delivery',
		icon: '⛽',
		priceRange: 'Coming Soon',
		description: 'Emergency fuel delivered to you',
		isEnabled: false,
	},
	{
		id: 'tire_change',
		label: 'Tire Change',
		icon: '🔧',
		priceRange: 'Coming Soon',
		description: 'Flat tire replacement',
		isEnabled: false,
	},
];

export function RequestServiceSheet({
	visible,
	onClose,
	onContinue,
}: RequestServiceSheetProps) {
	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={styles.sheet}>
					<TouchableOpacity onPress={onClose} style={styles.handleContainer}>
						<View style={styles.dragHandle} />
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end',
	},
	sheet: {
		height: SHEET_HEIGHT,
		backgroundColor: '#F5F5F5',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		overflow: 'hidden',
	},
	handleContainer: {
		backgroundColor: 'white',
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
