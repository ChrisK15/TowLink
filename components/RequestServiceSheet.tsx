import { ServiceType } from '@/types/models';
import { useState } from 'react';
import {
	Alert,
	Dimensions,
	FlatList,
	KeyboardAvoidingView,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import * as Location from 'expo-location';

export interface ServiceOption {
	id: ServiceType;
	label: string;
	icon: string;
	priceRange: string;
	isEnabled: boolean;
}

interface RequestServiceSheetProps {
	visible: boolean;
	onClose: () => void;
}

interface ServiceCardProps {
	option: ServiceOption;
	selected: boolean;
	onPress: () => void;
}

const SHEET_HEIGHT = Dimensions.get('window').height * 0.9;
const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2;
const SERVICE_OPTIONS: ServiceOption[] = [
	{
		id: 'tow',
		label: 'Towing',
		icon: '🚗',
		priceRange: '$75-120',
		isEnabled: true,
	},
	{
		id: 'jump_start',
		label: 'Jump Start',
		icon: '🔋',
		priceRange: '$45-65',
		isEnabled: false,
	},
	{
		id: 'fuel_delivery',
		label: 'Fuel Delivery',
		icon: '⛽',
		priceRange: '$35-50',
		isEnabled: false,
	},
	{
		id: 'tire_change',
		label: 'Tire Change',
		icon: '🔧',
		priceRange: '$50-75',
		isEnabled: false,
	},
	{
		id: 'lockout',
		label: 'Lockout',
		icon: '🔑',
		priceRange: '$55-80',
		isEnabled: false,
	},
	{
		id: 'winch_out',
		label: 'Winch Out',
		icon: '⚙️',
		priceRange: '$85-140',
		isEnabled: false,
	},
];

function ServiceCard({ option, selected, onPress }: ServiceCardProps) {
	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={!option.isEnabled}
			style={[
				styles.card,
				selected && styles.cardSelected,
				!option.isEnabled && styles.cardDisabled,
			]}
		>
			<Text style={styles.cardIcon}>{option.icon}</Text>
			<Text style={styles.cardLabel}>{option.label}</Text>
			<Text style={styles.cardPrice}>{option.priceRange}</Text>
		</TouchableOpacity>
	);
}

export function RequestServiceSheet({
	visible,
	onClose,
}: RequestServiceSheetProps) {
	const [selectedService, setSelectedService] = useState<ServiceType>('tow');
	const [pickupAddress, setPickupAddress] = useState('');
	const [dropoffAddress, setDropoffAddress] = useState('');
	const [vehicleYear, setVehicleYear] = useState('');
	const [vehicleMake, setVehicleMake] = useState('');
	const [vehicleModel, setVehicleModel] = useState('');
	const [additionalNotes, setAdditionalNotes] = useState('');
	const [isDetectingLocation, setIsDetectingLocation] = useState(false);

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
					<ScrollView style={styles.scrollView}>
						<Text style={styles.sectionTitle}>Select Service Type</Text>
						<FlatList
							data={SERVICE_OPTIONS}
							numColumns={2}
							scrollEnabled={false}
							contentContainerStyle={{ padding: 8 }}
							keyExtractor={(item) => item.id}
							renderItem={({ item }) => (
								<ServiceCard
									option={item}
									selected={selectedService === item.id}
									onPress={() => setSelectedService(item.id)}
								/>
							)}
						/>
					</ScrollView>
					<View style={styles.footer}>
						<TouchableOpacity style={styles.submitButton} disabled={true}>
							<Text style={styles.submitButtonText}>Request Service Now</Text>
						</TouchableOpacity>
					</View>
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
	scrollView: {
		flex: 1,
	},
	sectionTitle: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#000',
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: 'white',
	},
	card: {
		width: CARD_WIDTH,
		backgroundColor: 'white',
		borderRadius: 12,
		borderWidth: 2,
		borderColor: 'transparent',
		padding: 16,
		margin: 8,
		justifyContent: 'space-between',
		minHeight: 120,
	},
	cardSelected: {
		borderColor: '#1565C0',
		backgroundColor: 'rgba(21, 101, 192, 0.05)',
	},
	cardDisabled: {
		opacity: 0.4,
	},
	cardIcon: {
		fontSize: 32,
		marginBottom: 8,
	},
	cardLabel: {
		fontSize: 15,
		fontWeight: '600',
		color: '#000',
		marginBottom: 4,
	},
	cardPrice: {
		fontSize: 13,
		color: '#555',
	},
	footer: {
		backgroundColor: 'white',
		borderTopWidth: 1,
		borderTopColor: '#E0E0E0',
		padding: 16,
		paddingBottom: 32,
	},
	submitButton: {
		backgroundColor: '#CCCCCC',
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
	},
	submitButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold',
	},
});
