import { useAuth } from '@/context/auth-context';
import { updateDriverAvailability } from '@/services/firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function DriverScreen() {
	const { signOut, user } = useAuth();
	const [driverLocation, setDriverLocation] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);
	const [mapRef, setMapRef] = useState<MapView | null>(null);
	const [isOnline, setIsOnline] = useState(false);
	const [isToggling, setIsToggling] = useState(false); // prevents double tapping while firestore is updating

	// Get location
	useEffect(() => {
		getUserLocation();
	}, []);

	useEffect(() => {
		loadSavedState();
	}, []);

	async function handleToggleOnline(value: boolean) {
		if (!user?.uid) {
			Alert.alert('Error', 'You must be signed in');
			return;
		}
		if (value && !driverLocation) {
			Alert.alert('Location Required', 'Please enable location to go online');
			return;
		}

		try {
			setIsToggling(true);
			await updateDriverAvailability(
				user.uid,
				value,
				value ? driverLocation! : undefined,
			);
			setIsOnline(value);
			await AsyncStorage.setItem('driver_is_online', JSON.stringify(value));
			Alert.alert(value ? 'You are now online!' : 'You are now offline!');
		} catch (error: any) {
			Alert.alert('Error toggling:', error);
		} finally {
			setIsToggling(false);
		}
	}

	async function loadSavedState() {
		try {
			const saved = await AsyncStorage.getItem('driver_is_online');
			if (saved && user?.uid) {
				await updateDriverAvailability(user.uid, false, undefined);
				await AsyncStorage.setItem('driver_is_online', JSON.stringify(false));
			}
		} catch (error) {
			console.error('Error loading saved state:', error);
		}
	}

	async function getUserLocation() {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();

			if (status !== 'granted') {
				Alert.alert('Permission denied, location access needed');
				return;
			}

			const location = await Location.getCurrentPositionAsync({});

			setDriverLocation({
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
			});
		} catch (error) {
			Alert.alert(String(error));
		}
	}

	function centerOnDriver() {
		if (driverLocation && mapRef) {
			mapRef.animateToRegion(
				{
					latitude: driverLocation.latitude,
					longitude: driverLocation.longitude,
					latitudeDelta: 0.01,
					longitudeDelta: 0.01,
				},
				500,
			);
		}
	}

	return (
		<View style={styles.container}>
			<MapView
				ref={(ref) => setMapRef(ref)}
				style={styles.map}
				region={
					driverLocation
						? {
								latitude: driverLocation.latitude,
								longitude: driverLocation.longitude,
								latitudeDelta: 0.01,
								longitudeDelta: 0.01,
							}
						: undefined
				}
			>
				{driverLocation && (
					<Marker coordinate={driverLocation} pinColor="red" />
				)}
			</MapView>

			{/*Location Button bottom right*/}
			{driverLocation && (
				<TouchableOpacity
					style={styles.locationButton}
					onPress={centerOnDriver}
				>
					<Text>📍</Text>
				</TouchableOpacity>
			)}

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
