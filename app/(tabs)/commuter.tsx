import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function CommuterScreen() {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapRef, setMapRef] = useState<MapView | null>(null);

  // Get location
  useEffect(() => {
    getUserLocation();
  }, []);

  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission denied, location access needed");
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
        500
      );
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
        style={styles.requestButton}
        onPress={() => Alert.alert("Request pressed!")}
      >
        <Text style={styles.requestButtonText}>
          Request Roadside Assistance
        </Text>
      </TouchableOpacity>

      <Text style={styles.title}>Commuter Screen - Building...</Text>
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
    position: "absolute",
    top: 50,
    left: 20,
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 8,
  },
  locationButton: {
    position: "absolute",
    bottom: 180,
    right: 20,
    backgroundColor: "white",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  locationIcon: {
    fontSize: 24,
  },
  requestButton: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#00D9FF", // Cyan color from design
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  requestButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
});
