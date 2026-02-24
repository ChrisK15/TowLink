import { ActiveTripSheet } from '@/components/ActiveTripSheet';
import { RequestPopup } from '@/components/RequestPopup';
import { useAuth } from '@/context/auth-context';
import { useActiveTrip } from '@/hooks/use-active-trip';
import { useClaimedRequest } from '@/hooks/use-claimed-request';
import { db } from '@/services/firebase/config';
import {
	acceptClaimedRequest,
	declineClaimedRequest,
	updateDriverAvailability,
} from '@/services/firebase/firestore';
import { enrichRequestWithCalculations } from '@/services/requestCalculations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Linking,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
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
	const [showBanner, setShowbanner] = useState(false);
	const [isActioning, setIsActioning] = useState(false);
	const [activeTripId, setActiveTripId] = useState<string | null>(null);

	const { claimedRequest } = useClaimedRequest(user?.uid ?? null, isOnline);
	const { trip, commuterName, commuterPhone } = useActiveTrip(activeTripId);
	const showPopup = claimedRequest !== null;

	useEffect(() => {
		getUserLocation();
	}, []);

	useEffect(() => {
		if (user?.uid) {
			loadSavedState();
		}
	}, [user]);

	useEffect(() => {
		if (user?.uid) {
			initializeDriverDocument();
		}
	}, [user]);

	useEffect(() => {
		if (trip?.status === 'completed' || trip?.status === 'cancelled') {
			setActiveTripId(null);
		}
	}, [trip]);

	// make banner disappear after 2 seconds
	useEffect(() => {
		if (isOnline) {
			setShowbanner(true);
			const timer = setTimeout(() => setShowbanner(false), 2000);
			return () => clearTimeout(timer);
		} else {
			setShowbanner(false);
		}
	}, [isOnline]);

	const enrichedRequest = useMemo(() => {
		if (!claimedRequest || !driverLocation) return claimedRequest;
		return enrichRequestWithCalculations(claimedRequest, driverLocation);
	}, [claimedRequest, driverLocation]);

	async function initializeDriverDocument() {
		if (!user?.uid) {
			return;
		}
		try {
			const driverSnap = await getDoc(doc(db, 'drivers', user.uid));
			if (!driverSnap.exists()) {
				await setDoc(doc(db, 'drivers', user.uid), {
					userId: user.uid,
					isAvailable: false,
					isVerified: false,
					isActivelyDriving: false,
					vehicleInfo: {
						make: 'Unknown',
						model: 'Unknown',
						year: 2020,
						licensePlate: 'N/A',
						towingCapacity: 'Unknown',
					},
					currentLocation: { latitude: 0, longitude: 0 },
					serviceRadius: 10, // miles
					totalTrips: 0,
					createdAt: Timestamp.now(),
				});
			}
		} catch (error) {
			console.error('Error initializing driver document:', error);
		}
	}

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
			Alert.alert(
				'Error toggling: ',
				'failed to update status, please try again.',
			);
		} finally {
			setIsToggling(false);
		}
	}

	// Always start offline on app launch for safety/privacy.
	// If driver was online before a force-quit, this cleans up stale Firestore state.
	// Background persistence (staying online when app is backgrounded) is planned for Phase 3.
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
				Alert.alert(
					'Location Permission Required',
					'TowLink needs location access to show your position. Please enable it in Settings.',
					[
						{ text: 'Cancel', style: 'cancel' },
						{ text: 'Open Settings', onPress: () => Linking.openSettings() },
					],
				);
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

	// function handleTestPopup() {
	// 	const mockRequest = getRandomMockRequest();
	// 	claimedRequest(mockRequest);
	// 	setShowPopup(true);
	// }

	const handleAcceptRequest = useCallback(async () => {
		if (!claimedRequest || !user?.uid || isActioning) return;

		setIsActioning(true);
		try {
			const tripId = await acceptClaimedRequest(claimedRequest.id, user.uid);
			setActiveTripId(tripId);
		} catch (error: any) {
			Alert.alert('Error', error.message);
		} finally {
			setIsActioning(false);
		}
	}, [claimedRequest, user?.uid, isActioning]);

	const handleDeclineRequest = useCallback(async () => {
		if (!claimedRequest || !user?.uid || isActioning) return;
		if (claimedRequest?.status !== 'claimed') return;

		setIsActioning(true);
		try {
			await declineClaimedRequest(claimedRequest.id, user.uid);
			Alert.alert('Request Declined', 'Looking for another driver...');
		} catch (error: any) {
			Alert.alert('Error', error.message);
		} finally {
			setIsActioning(false);
		}
	}, [claimedRequest, user?.uid, isActioning]);

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

			{/* Status Card (top) */}
			<View style={styles.statusCard}>
				<View style={styles.statusRow}>
					<View
						style={[styles.statusDot, isOnline && styles.statusDotOnline]}
					/>
					<Text style={styles.statusText}>
						{isOnline ? 'Online' : 'Offline'}
					</Text>
				</View>

				<Switch
					style={{ alignSelf: 'center' }}
					value={isOnline}
					onValueChange={handleToggleOnline}
					disabled={isToggling}
					trackColor={{ false: '#D1D1D6', true: '#007AFF' }}
					thumbColor="#fff"
				/>
			</View>

			{/* Temporary Sign Out Button for Testing */}
			<TouchableOpacity
				style={styles.signOutButton}
				onPress={() => {
					Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
						{ text: 'Cancel', style: 'cancel' },
						{
							text: 'Sign Out',
							style: 'destructive',
							onPress: async () => {
								if (isOnline && user?.uid) {
									await updateDriverAvailability(user.uid, false, undefined);
									await AsyncStorage.setItem(
										'driver_is_online',
										JSON.stringify(false),
									);
								}
								signOut();
							},
						},
					]);
				}}
			>
				<Text style={styles.signOutText}>Sign Out</Text>
			</TouchableOpacity>

			{/* Info Banner */}
			{showBanner && (
				<View style={styles.infoBanner}>
					<Text style={styles.infoBannerTitle}>
						You're now online and broadcasting location
					</Text>
					<Text style={styles.infoBannerSubtitle}>
						Ready to receive service requests
					</Text>
				</View>
			)}

			{!isOnline ? (
				<View style={styles.bottomContainer}>
					<Text style={styles.bottomText}>
						Go online to start receiving requests
					</Text>
					<TouchableOpacity
						style={styles.goOnlineButton}
						onPress={() => handleToggleOnline(true)}
						disabled={isToggling}
					>
						<Text style={styles.goOnlineButtonText}>
							{isToggling ? 'Connecting...' : 'Go Online'}
						</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.bottomContainer}>
					<Text style={styles.waitingText}>Waiting for requests...</Text>
					{/* Test Popup code. Leaving just incase */}
					{/* <TouchableOpacity style={styles.testButton} onPress={handleTestPopup}>
						<Text style={styles.testButtonText}>🧪 Test Popup</Text>
					</TouchableOpacity> */}
				</View>
			)}

			{/*Location Button bottom right*/}
			{driverLocation && (
				<TouchableOpacity
					style={styles.locationButton}
					onPress={centerOnDriver}
				>
					<Text>📍</Text>
				</TouchableOpacity>
			)}
			<RequestPopup
				request={enrichedRequest ?? undefined}
				visible={showPopup}
				onAccept={handleAcceptRequest}
				onDecline={handleDeclineRequest}
				isLoading={isActioning}
			/>
			{activeTripId && (
				<ActiveTripSheet
					trip={trip}
					commuterName={commuterName}
					commuterPhone={commuterPhone}
				/>
			)}
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

	// Status Card (top)
	statusCard: {
		position: 'absolute',
		top: 50,
		left: 20,
		right: 20,
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 16,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
	},
	statusDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: '#8E8E93',
	},
	statusDotOnline: {
		backgroundColor: '#34C759',
	},
	statusText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#000',
	},

	// Temporary Sign Out Button
	signOutButton: {
		position: 'absolute',
		top: 145,
		left: 20,
		backgroundColor: '#FF3B30',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
	},
	signOutText: {
		color: 'white',
		fontSize: 12,
		fontWeight: 'bold',
	},

	// Info Banner (online only)
	infoBanner: {
		position: 'absolute',
		top: 145,
		left: 20,
		right: 20,
		backgroundColor: '#D1ECFF',
		borderRadius: 12,
		padding: 12,
	},
	infoBannerTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#000',
		marginBottom: 2,
	},
	infoBannerSubtitle: {
		fontSize: 12,
		color: '#666',
	},

	// Bottom Container
	bottomContainer: {
		position: 'absolute',
		bottom: 40,
		left: 20,
		right: 20,
		alignItems: 'center',
	},
	bottomText: {
		fontSize: 14,
		color: '#666',
		marginBottom: 12,
		textAlign: 'center',
	},
	goOnlineButton: {
		backgroundColor: '#007AFF',
		paddingVertical: 16,
		borderRadius: 12,
		width: '100%',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 5,
	},
	goOnlineButtonText: {
		color: 'white',
		fontSize: 16,
		fontWeight: 'bold',
	},
	waitingText: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
	},

	// Location Button
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
});
