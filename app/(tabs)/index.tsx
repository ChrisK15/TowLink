import {
  createRequest,
  listenForRequests,
} from "@/services/firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Button, ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  const [requests, setRequests] = useState<any[]>([]);

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

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        TowLink Test
      </Text>

      <Button title="Create Test Request" onPress={testCreateRequest} />

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
