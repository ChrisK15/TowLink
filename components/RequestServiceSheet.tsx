import { useAuth } from '@/context/auth-context';
import { createRequest } from '@/services/firebase/firestore';
import { geocodeAddress, reverseGeocode } from '@/services/geoLocationUtils';
import {
	calculateDistanceMiles,
	calculateFare,
} from '@/services/requestCalculations';
import { ServiceType } from '@/types/models';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
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
import Toast from 'react-native-toast-message';

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
	onRequestCreated: (requestId: string) => void;
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
	onRequestCreated,
}: RequestServiceSheetProps) {
	const { user } = useAuth();
	const [selectedService, setSelectedService] = useState<ServiceType>('tow');
	const [pickupAddress, setPickupAddress] = useState('');
	const [dropoffAddress, setDropoffAddress] = useState('');
	const [vehicleYear, setVehicleYear] = useState('');
	const [vehicleMake, setVehicleMake] = useState('');
	const [vehicleModel, setVehicleModel] = useState('');
	const [additionalNotes, setAdditionalNotes] = useState('');
	const [isDetectingLocation, setIsDetectingLocation] = useState(false);
	const [pickupCoords, setPickupCoords] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);
	const [dropoffCoords, setDropoffCoords] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);
	const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
	const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
	const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const yearIsValid =
		vehicleYear.trim().length === 4 && /^\d{4}$/.test(vehicleYear.trim());

	const isFormValid =
		pickupAddress.trim() !== '' &&
		dropoffAddress.trim() !== '' &&
		yearIsValid &&
		vehicleMake.trim() !== '' &&
		vehicleModel.trim() !== '';

	const handleDetectLocation = async () => {
		try {
			setIsDetectingLocation(true);

			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				Toast.show({ type: 'error', text1: 'Location permission denied', text2: 'Location access is needed to detect your position.', visibilityTime: 3000 });
				return;
			}

			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});

			setPickupCoords({
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
			});

			const address = await reverseGeocode(
				location.coords.latitude,
				location.coords.longitude,
			);
			setPickupAddress(address);
		} catch (error) {
			Toast.show({ type: 'error', text1: 'Could not detect location', text2: 'Please enter your address manually.', visibilityTime: 3000 });
		} finally {
			setIsDetectingLocation(false);
		}
	};

	const handleClose = () => {
		setPickupAddress('');
		setDropoffAddress('');
		setVehicleYear('');
		setVehicleMake('');
		setVehicleModel('');
		setAdditionalNotes('');
		setPickupCoords(null);
		setDropoffCoords(null);
		setDistanceMiles(null);
		setEstimatedPrice(null);
		setIsSubmitting(false);
		onClose();
	};

	const handleSubmit = async () => {
		if (!isFormValid) return;

		try {
			setIsSubmitting(true);

			// Resolve pickup coords — use GPS-stored value or geocode manual entry
			let finalPickupCoords = pickupCoords;
			if (!finalPickupCoords) {
				finalPickupCoords = await geocodeAddress(pickupAddress);
				if (!finalPickupCoords) {
					Toast.show({ type: 'error', text1: 'Could not find pickup address', text2: 'Try using Detect My Location or enter a more specific address.', visibilityTime: 3000 });
					return;
				}
			}

			// Resolve dropoff coords — use cached value from onEndEditing or geocode now
			let finalDropoffCoords = dropoffCoords;
			if (!finalDropoffCoords) {
				finalDropoffCoords = await geocodeAddress(dropoffAddress);
				if (!finalDropoffCoords) {
					Toast.show({ type: 'error', text1: 'Could not find drop-off address', text2: 'Please enter a more specific address.', visibilityTime: 3000 });
					return;
				}
			}

			const miles = calculateDistanceMiles(
				finalPickupCoords,
				finalDropoffCoords,
			);
			const price = calculateFare(miles);

			const vehicleInfo = {
				year: parseInt(vehicleYear, 10),
				make: vehicleMake.trim(),
				model: vehicleModel.trim(),
				licensePlate: '',
				towingCapacity: '',
			};

			const requestId = await createRequest(
				user?.uid ?? 'PLACEHOLDER_USER_ID',
				finalPickupCoords,
				finalDropoffCoords,
				pickupAddress,
				dropoffAddress,
				vehicleInfo,
				price,
				miles,
				additionalNotes.trim() || undefined,
				user?.displayName ?? undefined,
				user?.phoneNumber ?? undefined,
			);

			handleClose();
			onRequestCreated(requestId);
		} catch (error) {
			console.error('Error submitting request:', error);
			Toast.show({ type: 'error', text1: 'Failed to submit request', text2: 'Please try again.', visibilityTime: 3000 });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDropoffEndEditing = async () => {
		if (!dropoffAddress.trim() || !pickupAddress.trim()) return;

		try {
			setIsCalculatingPrice(true);

			// Resolve pickup coords — use GPS if available, otherwise geocode the typed address
			let resolvedPickupCoords = pickupCoords;
			if (!resolvedPickupCoords) {
				resolvedPickupCoords = await geocodeAddress(pickupAddress);
				if (!resolvedPickupCoords) return;
				setPickupCoords(resolvedPickupCoords);
			}

			const coords = await geocodeAddress(dropoffAddress);
			if (!coords) return;

			setDropoffCoords(coords);
			const miles = calculateDistanceMiles(resolvedPickupCoords, coords);
			setDistanceMiles(miles);
			setEstimatedPrice(calculateFare(miles));
		} catch (error) {
			console.error('Price calculation error:', error);
		} finally {
			setIsCalculatingPrice(false);
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={handleClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
			>
				<View style={styles.overlay}>
					<View style={styles.sheet}>
						<TouchableOpacity
							onPress={handleClose}
							style={styles.handleContainer}
						>
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
									testID="detect-location-btn"
									style={styles.detectButton}
									onPress={handleDetectLocation}
									disabled={isDetectingLocation}
								>
									<Text style={styles.detectButtonIcon}>📍</Text>
									<Text style={styles.detectButtonText}>
										{isDetectingLocation
											? 'Detecting...'
											: 'Detect My Location'}
									</Text>
								</TouchableOpacity>
								<View style={styles.inputRow}>
									<Text style={styles.inputIcon}>📍</Text>
									<TextInput
										testID="pickup-address-input"
										style={styles.textInput}
										placeholder="Enter pickup address"
										placeholderTextColor="#999"
										value={pickupAddress}
										onChangeText={setPickupAddress}
										returnKeyType="next"
									/>
								</View>
							</View>

							{/* Drop-off Location */}
							<View style={styles.formSection}>
								<Text style={styles.formSectionTitle}>Drop-off Location</Text>
								<View style={styles.inputRow}>
									<Text style={styles.inputIcon}>🔴</Text>
									<TextInput
										testID="dropoff-address-input"
										style={styles.textInput}
										placeholder="Enter destination address"
										placeholderTextColor="#999"
										value={dropoffAddress}
										onChangeText={setDropoffAddress}
										returnKeyType="next"
										onEndEditing={handleDropoffEndEditing}
									/>
								</View>
							</View>

							{/* Vehicle Details */}
							<View style={styles.formSection}>
								<Text style={styles.formSectionTitle}>Vehicle Details</Text>
								<View style={styles.vehicleRow}>
									<TextInput
										testID="vehicle-year-input"
										style={[
											styles.textInputStandalone,
											styles.vehicleInputHalf,
										]}
										placeholder="Year"
										placeholderTextColor="#999"
										value={vehicleYear}
										onChangeText={setVehicleYear}
										keyboardType="numeric"
										maxLength={4}
									/>
									<TextInput
										testID="vehicle-make-input"
										style={[
											styles.textInputStandalone,
											styles.vehicleInputHalf,
										]}
										placeholder="Make"
										placeholderTextColor="#999"
										value={vehicleMake}
										onChangeText={setVehicleMake}
										returnKeyType="next"
									/>
								</View>
								<TextInput
									testID="vehicle-model-input"
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
								<Text style={styles.formSectionTitle}>
									Additional Notes (Optional)
								</Text>
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
							{/* Price Breakdown */}
							{isCalculatingPrice && (
								<View style={styles.priceCard}>
									<Text style={styles.priceLabel}>Calculating price...</Text>
								</View>
							)}
							{!isCalculatingPrice &&
								estimatedPrice !== null &&
								distanceMiles !== null && (
									<View style={styles.priceCard}>
										<Text style={styles.priceCardTitle}>Price Breakdown</Text>

										<View style={styles.priceRow}>
											<Text style={styles.priceLabel}>Base Fare</Text>
											<Text style={styles.priceValue}>$50.00</Text>
										</View>

										<View style={styles.priceRow}>
											<Text style={styles.priceLabel}>
												Distance Charge ({distanceMiles.toFixed(1)} mi)
											</Text>
											<Text style={styles.priceValue}>
												${(distanceMiles * 5).toFixed(2)}
											</Text>
										</View>

										<View style={[styles.priceRow, styles.subtotalRow]}>
											<Text style={styles.priceLabel}>Subtotal</Text>
											<Text style={styles.priceValue}>
												${(50 + distanceMiles * 5).toFixed(2)}
											</Text>
										</View>

										<View style={styles.priceRow}>
											<Text style={styles.priceTotalLabel}>Total Price</Text>
											<Text style={styles.priceTotalValue}>
												${estimatedPrice}.00
											</Text>
										</View>
									</View>
								)}
						</ScrollView>
						<View style={styles.footer}>
							<TouchableOpacity
								testID="submit-request-btn"
								style={[
									styles.submitButton,
									isFormValid && styles.submitButtonEnabled,
								]}
								onPress={handleSubmit}
								disabled={!isFormValid || isSubmitting}
							>
								<Text style={styles.submitButtonText}>
									{isSubmitting ? 'Requesting...' : 'Request Service Now'}
								</Text>
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
	submitButtonEnabled: {
		backgroundColor: '#1565C0',
	},
	submitButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold',
	},
	formSection: {
		backgroundColor: 'white',
		marginTop: 8,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 20,
	},
	formSectionTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#000',
		marginBottom: 12,
	},
	detectButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#1565C0',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginBottom: 10,
		backgroundColor: 'white',
	},
	detectButtonIcon: {
		fontSize: 18,
		marginRight: 8,
	},
	detectButtonText: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1565C0',
	},
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#D0D0D0',
		borderRadius: 12,
		backgroundColor: 'white',
		paddingHorizontal: 12,
	},
	inputIcon: {
		fontSize: 16,
		marginRight: 8,
	},
	textInput: {
		flex: 1,
		fontSize: 15,
		color: '#000',
		paddingVertical: 12,
	},
	textInputStandalone: {
		borderWidth: 1,
		borderColor: '#D0D0D0',
		borderRadius: 12,
		backgroundColor: 'white',
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 15,
		color: '#000',
	},
	vehicleRow: {
		flexDirection: 'row',
		gap: 10,
		marginBottom: 10,
	},
	vehicleInputHalf: {
		flex: 1,
	},
	vehicleInputFull: {
		width: '100%',
	},
	priceCard: {
		backgroundColor: 'white',
		marginTop: 8,
		marginHorizontal: 16,
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	priceCardTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#000',
		marginBottom: 12,
	},
	priceRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 6,
	},
	subtotalRow: {
		borderTopWidth: 1,
		borderTopColor: '#E0E0E0',
		marginTop: 4,
		paddingTop: 10,
	},
	priceLabel: { fontSize: 15, color: '#555' },
	priceValue: { fontSize: 15, color: '#000' },
	priceTotalLabel: { fontSize: 17, fontWeight: 'bold', color: '#000' },
	priceTotalValue: { fontSize: 22, fontWeight: 'bold', color: '#1565C0' },
	notesInput: {
		borderWidth: 1,
		borderColor: '#D0D0D0',
		borderRadius: 12,
		backgroundColor: 'white',
		paddingHorizontal: 14,
		paddingTop: 12,
		paddingBottom: 12,
		fontSize: 15,
		color: '#000',
		minHeight: 90,
		textAlignVertical: 'top',
	},
});
