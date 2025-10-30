import {
  acceptRequest,
  createRequest,
  listenForRequests,
  updateTripStatus,
} from "@/services/firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Button, ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);

  useEffect(() => {
    console.log("start listening");
    const unsubscribe = listenForRequests((newRequests) => {
      setRequests(newRequests);
    });

    return () => {
      console.log("stop listening");
      unsubscribe();
    };
  }, []);

  async function testCreateRequest() {
    try {
      const requestId = await createRequest(
        "test-commuter-000",
        "123 Lego St",
        "456 Bionicle Ave"
      );

      Alert.alert(`Success!, request created with ID: ${requestId}`);
      console.log("Good");
    } catch (error) {
      Alert.alert(`Error! ${error}`);
      console.log("Bad");
    }
  }

  async function testAcceptRequest() {
    // accepts the first request
    if (requests.length === 0) {
      Alert.alert("No requests, create one first.");
      return;
    }

    try {
      const requestId = requests[0].id;
      const tripId = await acceptRequest(requestId, "test-driver-000");
      setCurrentTripId(tripId);
      Alert.alert(`Accepted, trip created: ${tripId}`);
      console.log(tripId);
    } catch (error) {
      Alert.alert(String(error));
      console.error(error);
    }
  }

  async function testUpdateStatus(newStatus: string) {
    if (!currentTripId) {
      Alert.alert("No trips, accept a request first to create a trip.");
      return;
    }

    try {
      await updateTripStatus(currentTripId, newStatus as any);
      Alert.alert(`Success, status updated to ${newStatus}`);
      if (newStatus === "completed") {
        setCurrentTripId(null);
      }
    } catch (error) {
      Alert.alert(String(error));
    }
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        TowLink Test
      </Text>

      <Button title="Create Test Request" onPress={testCreateRequest} />
      <View style={{ height: 10 }} />
      <Button title="Accept First Request" onPress={testAcceptRequest} />

      {currentTripId && (
        <View
          style={{
            marginTop: 20,
            padding: 15,
            backgroundColor: "#e3f2fd",
            borderRadius: 8,
          }}
        >
          <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
            Active Trip: {currentTripId.substring(0, 8)}...
          </Text>
          <Button
            title="Mark Arrived"
            onPress={() => testUpdateStatus("arrived")}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Mark In Progress"
            onPress={() => testUpdateStatus("in_progress")}
          />
          <View style={{ height: 10 }} />
          <Button
            title="Mark Completed"
            onPress={() => testUpdateStatus("completed")}
          />
        </View>
      )}

      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>
          Pending Requests: {requests.length}
        </Text>

        {requests.map((request) => (
          <View
            key={request.id}
            style={{
              padding: 15,
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              marginTop: 10,
              backgroundColor: "#f9f9f9",
            }}
          >
            <Text style={{ fontWeight: "bold" }}>
              ID: {request.id.substring(0, 8)}...
            </Text>
            <Text>Pickup: {request.address}</Text>
            <Text>Status: {request.status}</Text>
            <Text style={{ fontSize: 12, color: "#666" }}>
              Commuter: {request.commuterId}
            </Text>
          </View>
        ))}

        {requests.length === 0 && (
          <Text style={{ marginTop: 10, color: "#666", fontStyle: "italic" }}>
            No pending requests. Create one to see it appear!
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
