import { createRequest } from "@/services/firebase/firestore";
import { Alert, Button } from "react-native";

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

export default function HomeScreen() {
  return <Button title="Test Create Request" onPress={testCreateRequest} />;
}
