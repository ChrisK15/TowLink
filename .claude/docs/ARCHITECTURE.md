# TowLink Architecture

This document describes the system architecture, data models, and key technical patterns for the TowLink application.

---

## System Overview

TowLink is a **dual-mode mobile application** that connects commuters needing roadside towing with independent tow truck drivers. Users can switch between Commuter and Driver roles within the same app.

### Core Problem
- **Commuters**: Need quick, affordable roadside towing without insurance/AAA
- **Drivers**: Need steady income and consistent work without waiting on body shops
- **Solution**: Real-time marketplace connecting both sides with geolocation matching

---

## Architecture Patterns

### 1. Role-Based Navigation

Users can toggle between Commuter and Driver modes. Navigation structure changes dynamically based on active role using Expo Router groups:
- Auth screens shown when not authenticated
- Role-specific tab navigators shown when authenticated
- Role switching handled via user profile/settings

**Implementation:**
```typescript
// User profile determines active role
user.role: 'commuter' | 'driver' | 'both'

// Navigation adapts based on activeRole state
if (user.role === 'both') {
  // Show role switcher in UI
  // Load appropriate tab navigator
}
```

---

### 2. Real-Time Location System

**Driver Side:**
- When driver goes "online", start background location tracking (every 5-10 seconds)
- Update `driverLocations/{driverId}` in Firestore
- Use expo-location with background permissions
- Handle iOS/Android battery optimization differences

**Commuter Side:**
- During active trip, subscribe to matched driver's location
- Update ETA based on route recalculation
- Show driver moving on map in real-time

**Implementation Pattern:**
```typescript
// services/location/tracking.ts (future)
- startDriverTracking() - Begin background updates
- stopDriverTracking() - Clean up on offline
- updateDriverLocation() - Write to Firestore

// Real-time subscription in component
useEffect(() => {
  const unsubscribe = onSnapshot(
    doc(db, 'driverLocations', driverId),
    (snapshot) => {
      updateMapMarker(snapshot.data().location);
    }
  );
  return unsubscribe;
}, [driverId]);
```

---

### 3. Request Matching Algorithm

**Flow:**
1. Commuter creates request → writes to `requests/` collection
2. Cloud Function (or client-side logic) queries nearby drivers:
   - Filter by `isAvailable === true`
   - Filter by `serviceRadius` (geohash/geopoint query)
   - Sort by distance from request location
3. Notify closest driver first (FCM push notification)
4. 30-second timeout for response
5. If rejected/timeout, notify next closest driver
6. On acceptance, update request status to 'matched' and create trip document

**Key Challenges:**
- Prevent race conditions (use Firestore transactions)
- Handle concurrent requests to same driver
- Efficient geospatial queries (use geohash library like geofire-common)

**Example Implementation:**
```typescript
// Cloud Function: findNearbyDrivers
export const matchDriver = functions.firestore
  .document('requests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    
    // Query nearby drivers
    const drivers = await getNearbyDrivers(
      request.location,
      request.serviceRadius
    );
    
    // Notify closest available driver
    await notifyDriver(drivers[0].id, request.id);
  });
```

---

### 4. Trip State Machine

```
searching → matched → accepted → en_route → arrived → in_progress → completed
                 ↓
              cancelled (from any state)
```

**State Transitions:**
Each state change:
- Updates trip document in Firestore
- Sends notification to other party
- Updates UI on both sides
- May trigger location tracking start/stop

**Implementation:**
```typescript
async function updateTripStatus(
  tripId: string, 
  newStatus: TripStatus
) {
  await updateDoc(doc(db, 'trips', tripId), {
    status: newStatus,
    [`${newStatus}Time`]: serverTimestamp(),
  });
  
  // Trigger notifications
  await sendStatusNotification(tripId, newStatus);
}
```

---

## Data Models

### Firestore Collections

#### **users/** - User accounts
```typescript
interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: 'commuter' | 'driver' | 'both';
  rating: number;
  createdAt: Timestamp;
}
```

#### **drivers/** - Driver profiles
```typescript
interface Driver {
  id: string;
  userId: string;              // Reference to users/
  isAvailable: boolean;
  isVerified: boolean;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    towingCapacity: number;    // In pounds
  };
  serviceRadius: number;       // In miles
  currentLocation: GeoPoint;
  documents: {
    driversLicense: string;    // Storage URL
    insurance: string;
    registration: string;
  };
}
```

#### **requests/** - Service requests from commuters
```typescript
interface Request {
  id: string;
  commuterId: string;
  location: GeoPoint;
  address: string;
  serviceType: 'tow';          // Simplified for MVP
  status: 'searching' | 'matched' | 'accepted' | 'cancelled';
  matchedDriverId?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;        // 30 min timeout
}
```

#### **trips/** - Active and completed trips
```typescript
interface Trip {
  id: string;
  requestId: string;
  commuterId: string;
  driverId: string;
  status: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  pickupLocation: GeoPoint;
  dropoffLocation?: GeoPoint;
  startTime: Timestamp;
  arrivalTime?: Timestamp;
  completionTime?: Timestamp;
  distance?: number;           // In miles
  estimatedPrice: number;
  finalPrice?: number;
  driverPath: GeoPoint[];      // For trip replay
}
```

#### **driverLocations/** - Ephemeral real-time locations
```typescript
// Cleared frequently to save storage
interface DriverLocation {
  driverId: string;
  location: GeoPoint;
  heading: number;             // Compass bearing
  speed: number;               // m/s
  accuracy: number;            // meters
  timestamp: Timestamp;
}
```

---

## Services Layer Architecture

All business logic lives in `/services/` directory, separated from UI components.

### Current Structure

```
/services
  /firebase
    /config.ts       - Firebase initialization
    /firestore.ts    - Database operations
```

### Future Structure (as project grows)

```
/services
  /firebase
    /config.ts       - Firebase initialization
    /firestore.ts    - Core database operations
    /auth.ts         - Authentication service
  /location
    /tracking.ts     - GPS location tracking
    /geohash.ts      - Geospatial queries
  /maps
    /routing.ts      - Route calculation
    /geocoding.ts    - Address ↔ coordinates
  /payment
    /stripe.ts       - Payment processing
  /notifications
    /fcm.ts          - Push notifications
```

### Service Pattern

```typescript
// Each service exports async functions
// Services handle all side effects (API calls, database writes)
// Components import and call services

// Example: services/firebase/firestore.ts
export async function createRequest(
  commuterId: string,
  location: GeoPoint,
  address: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'requests'), {
    commuterId,
    location,
    address,
    serviceType: 'tow',
    status: 'searching',
    createdAt: serverTimestamp(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
  });
  return docRef.id;
}
```

---

## Real-Time Data Flow

### Example: Driver Accepting a Request

```
1. Commuter creates request
   → Write to requests/ collection
   
2. Driver's app listening to requests/
   → useEffect with onSnapshot listener
   → New request appears in UI
   
3. Driver taps "Accept"
   → Call acceptRequest(requestId, driverId)
   → Transaction updates request.status = 'accepted'
   → Creates new trip document
   
4. Both apps receive real-time updates
   → Commuter sees "Driver Assigned!"
   → Driver sees trip screen
   
5. Location tracking begins
   → Driver's location updates every 5-10s
   → Commuter's map shows driver approaching
```

### Listener Pattern

```typescript
// In React component
useEffect(() => {
  // Subscribe to real-time updates
  const unsubscribe = onSnapshot(
    collection(db, 'requests'),
    { 
      where: [['status', '==', 'searching']] 
    },
    (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(requests);
    }
  );
  
  // Cleanup on unmount
  return () => unsubscribe();
}, []);
```

---

## Performance Considerations

### Firestore Query Optimization
- **Index composite queries** in Firebase Console
- **Limit query results** with `.limit(10)`
- **Use pagination** for long lists (startAfter cursor)
- **Avoid querying entire collections**

### Location Updates
- **Balance accuracy vs battery**: 5-10 second intervals
- **Use significant location change** on iOS
- **Stop tracking** when driver goes offline
- **Clean up old locations** (Cloud Function scheduled task)

### Real-Time Listeners
- **Unsubscribe on unmount** to prevent memory leaks
- **Minimize listener scope** (specific document vs entire collection)
- **Use local cache** when possible

---

## Security Architecture

### Firestore Security Rules (Phase 1 - Development)

```javascript
// Current rules (permissive for development)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // TODO: Restrict in production
    }
  }
}
```

### Production Rules (Phase 4)

```javascript
// Users can only edit their own profile
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
}

// Requests must be created by authenticated user
match /requests/{requestId} {
  allow create: if request.auth != null 
    && request.resource.data.commuterId == request.auth.uid;
  allow read: if request.auth != null;
  allow update: if request.auth != null 
    && (resource.data.commuterId == request.auth.uid 
        || resource.data.matchedDriverId == request.auth.uid);
}

// Trips are read-only for participants
match /trips/{tripId} {
  allow read: if request.auth != null 
    && (resource.data.commuterId == request.auth.uid 
        || resource.data.driverId == request.auth.uid);
  allow update: if request.auth != null 
    && resource.data.driverId == request.auth.uid;
}
```

---

## Error Handling Patterns

### Standard Error Handling

```typescript
try {
  await createRequest(userId, location, address);
  Alert.alert('Success', 'Request created!');
} catch (error) {
  console.error('Error creating request:', error);
  Alert.alert(
    'Error',
    'Failed to create request. Please try again.'
  );
}
```

### Network Error Handling

```typescript
// Check for connectivity
import NetInfo from '@react-native-community/netinfo';

const state = await NetInfo.fetch();
if (!state.isConnected) {
  Alert.alert('No Internet', 'Please check your connection');
  return;
}
```

---

## Testing Strategy

### Phase 2-3: Manual Testing
- Test on real devices (iOS and Android)
- Test location permissions flow
- Test offline behavior
- Verify map performance

### Phase 4: Automated Testing
- **Unit tests**: Services layer (Jest)
- **Component tests**: UI components (React Native Testing Library)
- **E2E tests**: Critical flows (Detox)
- **Firebase emulator**: Local testing of Cloud Functions

---

## Future Enhancements

### Phase 3: Smart Matching
- Geohash-based spatial queries
- Multi-driver notification cascade
- ETA calculation and display
- Route optimization

### Phase 4: Production Polish
- Comprehensive error handling
- Offline mode support
- Trip history and analytics
- Driver ratings and reviews
- Payment processing (Stripe)
- Driver background checks

---

*For implementation details, see technical specifications in `.claude/specs/`*  
*For code examples, see `.claude/docs/PATTERNS.md`*
