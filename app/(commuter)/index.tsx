import { useAuth } from '@/context/auth-context';
import { createRequest } from '@/services/firebase/firestore';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function CommuterScreen() {
	const { signOut, user } = useAuth();
	const [userLocation, setUserLocation] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);
	const [mapRef, setMapRef] = useState<MapView | null>(null);
	const [selectedService, setSelectedService] = useState('towing');
	const [isCreatingRequest, setIsCreatingRequest] = useState(false);

	// Get location
	useEffect(() => {
		getUserLocation();
	}, []);

	async function getUserLocation() {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();

			if (status !== 'granted') {
				Alert.alert('Permission denied, location access needed');
				return;
			}

			const location = await Location.getCurrentPositionAsync({});

			setUserLocation({
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
			});
		} catch (error) {
			Alert.alert(String(error));
		}
	}

	function centerOnUser() {
		if (userLocation && mapRef) {
			mapRef.animateToRegion(
				{
					latitude: userLocation.latitude,
					longitude: userLocation.longitude,
					latitudeDelta: 0.01,
					longitudeDelta: 0.01,
				},
				500,
			);
		}
	}

	async function handleRequestAssistance() {
		if (!userLocation) {
			Alert.alert('Location required, please wait for your location to load');
			return;
		}

		if (userLocation.latitude === 0 && userLocation.longitude === 0) {
			Alert.alert('GPS Not Ready', 'Waiting for GPS Signal...');
			return;
		}

		if (!user) {
			Alert.alert('Error', 'You must be signed in to create a request');
			return;
		}

		setIsCreatingRequest(true);
		try {
			const requestId = await createRequest(
				user.uid, // Use the actual authenticated user's ID
				userLocation,
				{ latitude: 34.2407, longitude: -118.53 }, //CSUN coordinates, temporary will change later
				'Test pickup address',
				'Test dropoff address',
			);
			Alert.alert('Request sent, searching for nearby drivers...');

			console.log('Request created:', requestId);
		} catch (error) {
			Alert.alert('Error, failed to create a request. Please try again');
			console.error(error);
		} finally {
			setIsCreatingRequest(false);
		}
	}

	return (
		<View style={styles.container}>
			<MapView
				ref={(ref) => setMapRef(ref)}
				style={styles.map}
				region={
					userLocation
						? {
								latitude: userLocation.latitude,
								longitude: userLocation.longitude,
								latitudeDelta: 0.01,
								longitudeDelta: 0.01,
							}
						: undefined
				}
			>
				{userLocation && <Marker coordinate={userLocation} pinColor="cyan" />}
			</MapView>

			{/*Location Button bottom right*/}
			{userLocation && (
				<TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
					<Text style={styles.locationIcon}>📍</Text>
				</TouchableOpacity>
			)}

			{/* Request Button bottom */}
			<TouchableOpacity
				style={[
					styles.requestButton,
					isCreatingRequest && styles.requestButtonDisabled,
				]}
				onPress={handleRequestAssistance}
				disabled={isCreatingRequest}
			>
				<Text style={styles.requestButtonText}>
					{isCreatingRequest
						? 'Creating Request...'
						: 'Request Roadside Assistance'}
				</Text>
			</TouchableOpacity>

			{/* Temporary Sign Out Button for Testing */}
			<TouchableOpacity
				style={styles.signOutButton}
				onPress={() => {
					Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
						{ text: 'Cancel', style: 'cancel' },
						{
							text: 'Sign Out',
							style: 'destructive',
							onPress: () => signOut(),
						},
					]);
				}}
			>
				<Text style={styles.signOutText}>Sign Out</Text>
			</TouchableOpacity>

			<Text style={styles.title}>Commuter Screen</Text>

			{/* Service type selector */}
			<View style={styles.serviceSelector}>
				<TouchableOpacity
					style={[
						styles.serviceOption,
						selectedService === 'towing' && styles.serviceOptionActive,
					]}
					onPress={() => setSelectedService('towing')}
				>
					<Text style={styles.serviceIcon}>🚗</Text>
					<Text style={styles.serviceText}>Towing</Text>
				</TouchableOpacity>

				<View style={[styles.serviceOption, styles.serviceOptionDisabled]}>
					<Text style={styles.serviceIcon}>🔋</Text>
					<Text style={styles.serviceText}>Battery</Text>
				</View>

				<View style={[styles.serviceOption, styles.serviceOptionDisabled]}>
					<Text style={styles.serviceIcon}>⛽</Text>
					<Text style={styles.serviceText}>Fuel</Text>
				</View>

				<View style={[styles.serviceOption, styles.serviceOptionDisabled]}>
					<Text style={styles.serviceIcon}>🔧</Text>
					<Text style={styles.serviceText}>Tire</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	map: {
		flex: 1,
	},
	title: {
		position: 'absolute',
		top: 50,
		left: 100,
		fontSize: 20,
		fontWeight: 'bold',
		color: 'white',
		backgroundColor: 'rgba(0,0,0,0.5)',
		padding: 10,
		borderRadius: 8,
	},
	locationButton: {
		position: 'absolute',
		bottom: 180,
		right: 20,
		backgroundColor: 'white',
		width: 50,
		height: 50,
		borderRadius: 25,
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 5,
	},
	locationIcon: {
		fontSize: 24,
	},
	requestButton: {
		position: 'absolute',
		bottom: 105,
		left: 20,
		right: 20,
		backgroundColor: '#00D9FF', // Cyan color from design
		paddingVertical: 18,
		borderRadius: 12,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 8,
	},
	requestButtonDisabled: {
		opacity: 0.6,
	},
	requestButtonText: {
		color: '#000',
		fontSize: 18,
		fontWeight: 'bold',
	},
	serviceSelector: {
		position: 'absolute',
		bottom: 20,
		left: 20,
		right: 20,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	serviceOption: {
		backgroundColor: 'rgba(40, 40, 40, 0.9)',
		padding: 12,
		borderRadius: 12,
		alignItems: 'center',
		flex: 1,
		marginHorizontal: 5,
		borderWidth: 2,
		borderColor: 'transparent',
	},
	serviceOptionActive: {
		borderColor: '#00D9FF',
		backgroundColor: 'rgba(0, 217, 255, 0.2)',
	},
	serviceOptionDisabled: {
		opacity: 0.5,
	},
	serviceIcon: {
		fontSize: 28,
		marginBottom: 4,
	},
	serviceText: {
		color: 'white',
		fontSize: 12,
		fontWeight: '600',
	},
	signOutButton: {
		position: 'absolute',
		top: 50,
		right: 20,
		backgroundColor: '#FF3B30',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 5,
	},
	signOutText: {
		color: 'white',
		fontSize: 14,
		fontWeight: 'bold',
	},
});
