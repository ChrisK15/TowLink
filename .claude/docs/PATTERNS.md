# TowLink Coding Patterns & Conventions

This document contains common patterns, conventions, and best practices used throughout the TowLink codebase.

---

## File Organization Patterns

### React Native Screen Pattern

```typescript
// app/(tabs)/screen-name.tsx

import { View, StyleSheet, Alert } from 'react-native';
import { useState, useEffect } from 'react';

// Import services
import { someService } from '@/services/firebase/firestore';

// Import types
import { SomeType } from '@/types/models';

// Import components
import { ThemedView } from '@/components/ThemedView';

export default function ScreenName() {
  // State declarations
  const [data, setData] = useState<SomeType[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Effects
  useEffect(() => {
    loadData();
  }, []);
  
  // Event handlers
  const handleAction = async () => {
    try {
      setLoading(true);
      await someService();
      Alert.alert('Success', 'Action completed');
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  // Render
  return (
    <ThemedView style={styles.container}>
      {/* UI components */}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

---

## Firebase Patterns

### Creating Documents

```typescript
// services/firebase/firestore.ts

import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';

export async function createDocument(data: SomeData): Promise<string> {
  const docRef = await addDoc(collection(db, 'collectionName'), {
    ...data,
    createdAt: serverTimestamp(), // Always use server timestamp
  });
  return docRef.id;
}
```

### Reading Documents

```typescript
import { doc, getDoc } from 'firebase/firestore';

export async function getDocument(id: string): Promise<SomeType | null> {
  const docRef = doc(db, 'collectionName', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as SomeType;
}
```

### Real-Time Listeners

```typescript
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function listenToDocuments(
  filter: string,
  callback: (documents: SomeType[]) => void
): () => void {
  const q = query(
    collection(db, 'collectionName'),
    where('status', '==', filter)
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SomeType[];
    
    callback(documents);
  });
  
  return unsubscribe; // Return cleanup function
}
```

### Updating Documents

```typescript
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export async function updateDocument(
  id: string,
  updates: Partial<SomeType>
): Promise<void> {
  const docRef = doc(db, 'collectionName', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
```

### Using Transactions (For Race Conditions)

```typescript
import { runTransaction, doc } from 'firebase/firestore';

export async function acceptRequest(
  requestId: string,
  driverId: string
): Promise<boolean> {
  const requestRef = doc(db, 'requests', requestId);
  
  return await runTransaction(db, async (transaction) => {
    const requestDoc = await transaction.get(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }
    
    const request = requestDoc.data();
    
    // Check if already accepted
    if (request.status !== 'searching') {
      return false; // Too late, someone else got it
    }
    
    // Atomically update
    transaction.update(requestRef, {
      status: 'accepted',
      matchedDriverId: driverId,
      acceptedAt: serverTimestamp(),
    });
    
    return true;
  });
}
```

---

## React Hooks Patterns

### useState with TypeScript

```typescript
// Primitive types
const [count, setCount] = useState<number>(0);
const [text, setText] = useState<string>('');
const [enabled, setEnabled] = useState<boolean>(false);

// Object types
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<Item[]>([]);

// Updating state
setText('new value');
setCount(prev => prev + 1);
setItems(prev => [...prev, newItem]);
```

### useEffect Patterns

```typescript
// Run once on mount
useEffect(() => {
  loadInitialData();
}, []);

// Run when dependency changes
useEffect(() => {
  fetchUserData(userId);
}, [userId]);

// Cleanup function
useEffect(() => {
  const unsubscribe = subscribeToUpdates();
  
  return () => {
    unsubscribe(); // Cleanup on unmount
  };
}, []);

// Async operations in useEffect
useEffect(() => {
  let cancelled = false;
  
  const loadData = async () => {
    try {
      const data = await fetchData();
      if (!cancelled) {
        setData(data);
      }
    } catch (error) {
      if (!cancelled) {
        console.error(error);
      }
    }
  };
  
  loadData();
  
  return () => {
    cancelled = true; // Prevent state updates after unmount
  };
}, []);
```

---

## Map Component Patterns

### Basic MapView Setup

```typescript
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';

const [region, setRegion] = useState<Region>({
  latitude: 34.0522,
  longitude: -118.2437,
  latitudeDelta: 0.05,
  latitudeDelta: 0.05,
});

// Get user location
const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission denied', 'Location access is required');
    return;
  }
  
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  
  setRegion({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
};

// Render map
<MapView
  style={{ flex: 1 }}
  region={region}
  showsUserLocation={true}
  showsMyLocationButton={true}
>
  <Marker
    coordinate={{
      latitude: region.latitude,
      longitude: region.longitude,
    }}
    title="Pickup Location"
  />
</MapView>
```

---

## Error Handling Patterns

### Standard Try-Catch Pattern

```typescript
const handleAction = async () => {
  try {
    setLoading(true);
    
    // Perform action
    const result = await someAsyncOperation();
    
    // Success feedback
    Alert.alert('Success', 'Operation completed');
    
    return result;
    
  } catch (error) {
    console.error('Error in handleAction:', error);
    
    // User-friendly error message
    Alert.alert(
      'Error',
      'Something went wrong. Please try again.'
    );
    
  } finally {
    setLoading(false);
  }
};
```

### Firebase-Specific Error Handling

```typescript
import { FirebaseError } from 'firebase/app';

try {
  await firebaseOperation();
} catch (error) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        Alert.alert('Permission Denied', 'You don\'t have access');
        break;
      case 'not-found':
        Alert.alert('Not Found', 'Document doesn\'t exist');
        break;
      case 'unavailable':
        Alert.alert('Offline', 'Check your internet connection');
        break;
      default:
        Alert.alert('Error', error.message);
    }
  } else {
    Alert.alert('Error', 'An unexpected error occurred');
  }
}
```

---

## Styling Patterns

### StyleSheet Organization

```typescript
const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Specific components
  button: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // State-specific
  buttonDisabled: {
    opacity: 0.5,
  },
});
```

### Conditional Styling

```typescript
<View style={[
  styles.button,
  disabled && styles.buttonDisabled,
  isActive && styles.buttonActive,
]} />
```

### Themed Components

```typescript
import { useThemeColor } from '@/hooks/useThemeColor';

const backgroundColor = useThemeColor(
  { light: '#FFFFFF', dark: '#000000' },
  'background'
);

<View style={{ backgroundColor }} />
```

---

## TypeScript Patterns

### Defining Interfaces

```typescript
// types/models.ts

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export type UserRole = 'commuter' | 'driver' | 'both';

export interface Request {
  id: string;
  commuterId: string;
  location: Location;
  status: RequestStatus;
  createdAt: Date;
}

export type RequestStatus = 
  | 'searching' 
  | 'matched' 
  | 'accepted' 
  | 'cancelled';

export interface Location {
  latitude: number;
  longitude: number;
}
```

### Function Typing

```typescript
// Explicit return types
async function getUser(id: string): Promise<User | null> {
  // ...
}

// Function parameters
function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

// Optional parameters
function createRequest(
  location: Location,
  notes?: string
): Promise<string> {
  // ...
}
```

---

## Testing Patterns (Future)

### Component Testing

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import ScreenName from '../ScreenName';

describe('ScreenName', () => {
  it('renders correctly', () => {
    const { getByText } = render(<ScreenName />);
    expect(getByText('Title')).toBeTruthy();
  });
  
  it('handles button press', () => {
    const { getByText } = render(<ScreenName />);
    const button = getByText('Press Me');
    fireEvent.press(button);
    // Assert expected behavior
  });
});
```

### Service Testing

```typescript
import { createRequest } from '../firestore';

describe('createRequest', () => {
  it('creates a request document', async () => {
    const requestId = await createRequest(mockLocation, 'test-user');
    expect(requestId).toBeTruthy();
    
    // Verify in Firestore emulator
    const doc = await getDoc(doc(db, 'requests', requestId));
    expect(doc.exists()).toBe(true);
  });
});
```

---

## Common Gotchas

### Don't Forget Cleanup

```typescript
// ❌ BAD - Memory leak
useEffect(() => {
  const unsubscribe = onSnapshot(query, callback);
}, []);

// ✅ GOOD - Cleanup on unmount
useEffect(() => {
  const unsubscribe = onSnapshot(query, callback);
  return () => unsubscribe();
}, []);
```

### Handle Async State Updates

```typescript
// ❌ BAD - State update after unmount
useEffect(() => {
  fetchData().then(data => setData(data));
}, []);

// ✅ GOOD - Check if still mounted
useEffect(() => {
  let mounted = true;
  
  fetchData().then(data => {
    if (mounted) setData(data);
  });
  
  return () => { mounted = false; };
}, []);
```

### Use serverTimestamp()

```typescript
// ❌ BAD - Client timestamp (unreliable)
await addDoc(collection, {
  createdAt: new Date(),
});

// ✅ GOOD - Server timestamp (consistent)
await addDoc(collection, {
  createdAt: serverTimestamp(),
});
```

---

## Environment Variables

### Accessing in Code

```typescript
// app.config.js already set up
const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Always check if exists
if (!apiKey) {
  throw new Error('Google Maps API key not configured');
}
```

### Never Commit Secrets

```bash
# .gitignore
.env
.env.local
firebase-admin-key.json
```

---

*For architecture details, see `.claude/docs/ARCHITECTURE.md`*  
*For development setup, see `.claude/docs/DEVELOPMENT.md`*
