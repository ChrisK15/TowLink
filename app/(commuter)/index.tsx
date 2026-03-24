import { RequestServiceSheet } from '@/components/RequestServiceSheet';
import { TripCompletionScreen } from '@/components/TripCompletionScreen';
import { FindingDriverModal } from '@/components/FindingDriverModal';
import { CommuterTripSheet } from '@/components/CommuterTripSheet';
import { useAuth } from '@/context/auth-context';
import { useDriverLocation } from '@/hooks/use-driver-location';
import { useCommuterTrip } from '@/hooks/use-commuter-trip';
import { fetchDirections } from '@/services/directions';
import { getActiveTripForCommuter } from '@/services/firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, MapMarker } from 'react-native-maps';

export default function CommuterScreen() {
	const { signOut, user } = useAuth();
	const [userLocation, setUserLocation] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);
	const [mapRef, setMapRef] = useState<MapView | null>(null);
	const [showServiceSheet, setShowServiceSheet] = useState(false);
	const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
	const [showFindingModal, setShowFindingModal] = useState(false);
	const [activeTripId, setActiveTripId] = useState<string | null>(null);
	const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
	const [eta, setEta] = useState<string | null>(null);
	const [showCompletion, setShowCompletion] = useState(false);

	const { trip, driverName } = useCommuterTrip(activeTripId);
	const driverLocation = useDriverLocation(trip?.driverId ?? null);
	const driverMarkerRef = useRef<MapMarker>(null);

	// Check for existing active trip on mount
	useEffect(() => {
		if (!user?.uid) return;
		getActiveTripForCommuter(user.uid).then((result) => {
			if (result) setActiveTripId(result.id);
		});
	}, [user?.uid]);

	// Get location
	useEffect(() => {
		getUserLocation();
	}, []);

	// Smooth marker animation (Google Maps only — Apple Maps doesn't support it)
	const prevDriverLocation = useRef(driverLocation);
	useEffect(() => {
		if (driverLocation && driverMarkerRef.current && prevDriverLocation.current && Platform.OS === 'android') {
			driverMarkerRef.current.animateMarkerToCoordinate(driverLocation, 250);
		}
		prevDriverLocation.current = driverLocation;
	}, [driverLocation]);

	// Fetch route and ETA based on trip status, refresh every 30s
	useEffect(() => {
		if (!trip || !driverLocation) return;
		if (trip.status === 'completed' || trip.status === 'cancelled') {
			setRouteCoords([]);
			setEta(null);
			return;
		}

		let origin: { latitude: number; longitude: number };
		let destination: { latitude: number; longitude: number };

		if (trip.status === 'en_route' || trip.status === 'arrived') {
			origin = driverLocation;
			destination = trip.pickupLocation;
		} else if (trip.status === 'in_progress') {
			origin = trip.pickupLocation;
			destination = trip.dropoffLocation;
		} else {
			return;
		}

		const fetchAndSetRoute = async () => {
			const result = await fetchDirections(origin, destination);
			if (result) {
				setRouteCoords(result.polylineCoords);
				setEta(result.durationText);
			}
		};

		fetchAndSetRoute();
		const interval = setInterval(fetchAndSetRoute, 30_000);
		return () => clearInterval(interval);
	}, [trip?.status, !!driverLocation]);

	// Fit map to show driver and destination
	useEffect(() => {
		if (!trip || !driverLocation || !mapRef) return;
		if (trip.status === 'completed' || trip.status === 'cancelled') return;

		const destination =
			trip.status === 'in_progress' ? trip.dropoffLocation : trip.pickupLocation;

		mapRef.fitToCoordinates([driverLocation, destination], {
			edgePadding: { top: 80, right: 60, bottom: 300, left: 60 },
			animated: true,
		});
	}, [trip?.id, !!driverLocation]);

	useEffect(() => {
		if (trip?.status === 'completed') {
			setShowCompletion(true);
		}
	}, [trip?.status]);

	function handleCompletionDone() {
		setShowCompletion(false);
		setActiveTripId(null);
		setActiveRequestId(null);
	}

	async function getUserLocation() {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();

			if (status !== 'granted') {
				Alert.alert(
					'Location Required',
					'TowLink needs your location to request roadside assistance. Enable it in Settings.',
					[
						{ text: 'Cancel', style: 'cancel' },
						{ text: 'Open Settings', onPress: () => Linking.openSettings() },
					],
				);
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

		setShowServiceSheet(true);
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

				{driverLocation && activeTripId && (
					<Marker
						ref={driverMarkerRef}
						coordinate={driverLocation}
						tracksViewChanges={false}
						anchor={{ x: 0.5, y: 0.5 }}
					>
						<View style={styles.driverMarker}>
							<Ionicons name="car" size={18} color="white" />
						</View>
					</Marker>
				)}

				{routeCoords.length > 0 && (
					<Polyline
						coordinates={routeCoords}
						strokeColor="#1565C0"
						strokeWidth={4}
					/>
				)}
			</MapView>

			{/*Location Button bottom right*/}
			{userLocation && (
				<TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
					<Text style={styles.locationIcon}>📍</Text>
				</TouchableOpacity>
			)}

			{/* Request Button bottom */}
			{!activeTripId && (
				<TouchableOpacity
					testID="request-assistance-btn"
					style={styles.requestButton}
					onPress={handleRequestAssistance}
				>
					<Text style={styles.requestButtonText}>
						Request Roadside Assistance
					</Text>
				</TouchableOpacity>
			)}

			<RequestServiceSheet
				visible={showServiceSheet}
				onClose={() => setShowServiceSheet(false)}
				onRequestCreated={(requestId) => {
					setActiveRequestId(requestId);
					setShowFindingModal(true);
				}}
			/>

			<FindingDriverModal
				visible={showFindingModal}
				requestId={activeRequestId}
				onDriverFound={(tripId) => {
					setShowFindingModal(false);
					setActiveTripId(tripId);
				}}
				onCancel={() => {
					setShowFindingModal(false);
					setActiveRequestId(null);
				}}
				onRetry={() => {
					setShowFindingModal(false);
					setActiveRequestId(null);
					setShowServiceSheet(true);
				}}
			/>

			{activeTripId && (
				<CommuterTripSheet
					tripId={activeTripId}
					onTripCompleted={() => {
						// Only clear for cancelled — completed is handled by showCompletion overlay
						if (trip?.status === 'cancelled') {
							setActiveTripId(null);
							setActiveRequestId(null);
						}
					}}
					eta={eta}
				/>
			)}

			{showCompletion && trip && (
				<TripCompletionScreen
					visible={showCompletion}
					role="commuter"
					trip={trip}
					otherPartyName={driverName}
					onDone={handleCompletionDone}
				/>
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
	requestButtonText: {
		color: '#000',
		fontSize: 18,
		fontWeight: 'bold',
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
	driverMarker: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#34C759',
		borderWidth: 2,
		borderColor: 'white',
		justifyContent: 'center',
		alignItems: 'center',
	},
});
