import { ServiceType } from '@/types/models';
import * as Location from 'expo-location';
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

	const handleDetectLocation = async () => {
		try {
			setIsDetectingLocation(true);

			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert(
					'Permission Denied',
					'Location access is needed to detect your position.',
				);
				return;
			}

			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});

			const coords = `Lat: ${location.coords.latitude.toFixed(4)}, Lng: ${location.coords.longitude.toFixed(4)}`;
			setPickupAddress(coords);
		} catch (error) {
			Alert.alert(
				'Location Error',
				'Could not detect location. Please enter your address manually.',
			);
		} finally {
			setIsDetectingLocation(false);
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
			>
				<View style={styles.overlay}>
					<View style={styles.sheet}>
						<TouchableOpacity onPress={onClose} style={styles.handleContainer}>
							<View style={styles.dragHandle} />
						</TouchableOpacity>
						<ScrollView
							style={styles.scrollView}
							keyboardShouldPersistTaps="handled"
						>
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

						{/* Pickup Location */}
						<View style={styles.formSection}>
							<Text style={styles.formSectionTitle}>Pickup Location</Text>
							<TouchableOpacity
								style={styles.detectButton}
								onPress={handleDetectLocation}
								disabled={isDetectingLocation}
							>
								<Text style={styles.detectButtonIcon}>📍</Text>
								<Text style={styles.detectButtonText}>
									{isDetectingLocation ? 'Detecting...' : 'Detect My Location'}
								</Text>
							</TouchableOpacity>
							<View style={styles.inputRow}>
								<Text style={styles.inputIcon}>📍</Text>
								<TextInput
									style={styles.textInput}
									placeholder="Enter pickup address"
									placeholderTextColor="#999"
									value={pickupAddress}
									onChangeText={setPickupAddress}
									returnKeyType="next"
								/>
							</View>
						</View>

						{/* Vehicle Details */}
						<View style={styles.formSection}>
							<Text style={styles.formSectionTitle}>Vehicle Details</Text>
							<View style={styles.vehicleRow}>
								<TextInput
									style={[styles.textInputStandalone, styles.vehicleInputHalf]}
									placeholder="Year"
									placeholderTextColor="#999"
									value={vehicleYear}
									onChangeText={setVehicleYear}
									keyboardType="numeric"
									maxLength={4}
									returnKeyType="next"
								/>
								<TextInput
									style={[styles.textInputStandalone, styles.vehicleInputHalf]}
									placeholder="Make"
									placeholderTextColor="#999"
									value={vehicleMake}
									onChangeText={setVehicleMake}
									returnKeyType="next"
								/>
							</View>
							<TextInput
								style={[styles.textInputStandalone, styles.vehicleInputFull]}
								placeholder="Model"
								placeholderTextColor="#999"
								value={vehicleModel}
								onChangeText={setVehicleModel}
								returnKeyType="done"
							/>
						</View>

						{/* Additional Notes */}
						<View style={styles.formSection}>
							<Text style={styles.formSectionTitle}>Additional Notes (Optional)</Text>
							<TextInput
								style={styles.notesInput}
								placeholder="e.g., Special instructions, parking details..."
								placeholderTextColor="#999"
								value={additionalNotes}
								onChangeText={setAdditionalNotes}
								multiline={true}
								numberOfLines={4}
								textAlignVertical="top"
							/>
						</View>

						{/* Drop-off Location */}
						<View style={styles.formSection}>
							<Text style={styles.formSectionTitle}>Drop-off Location</Text>
							<View style={styles.inputRow}>
								<Text style={styles.inputIcon}>🔴</Text>
								<TextInput
									style={styles.textInput}
									placeholder="Enter destination address"
									placeholderTextColor="#999"
									value={dropoffAddress}
									onChangeText={setDropoffAddress}
									returnKeyType="next"
								/>
							</View>
						</View>

						</ScrollView>
						<View style={styles.footer}>
							<TouchableOpacity style={styles.submitButton} disabled={true}>
								<Text style={styles.submitButtonText}>Request Service Now</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
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
