# Technical Specification: TOW-52

## Story Reference
**Jira**: [TOW-52 - Request Assignment & Claiming Logic](https://chriskelamyan115.atlassian.net/browse/TOW-52)

**Story**: As a driver, I want to be the only driver who sees a specific request, so that multiple drivers don't try to accept the same job.

**Context**: This story implements the core matching algorithm that connects commuter requests to the closest available driver using atomic claim logic and geospatial queries. This is an 8-point story that forms the foundation of the TowLink matching system.

---

## Architecture Overview

This feature introduces a **sequential assignment system** where requests are claimed by one driver at a time, with automatic reassignment on timeout or decline.

### System Flow
```
Commuter creates request (status: 'searching')
    ↓
Cloud Function triggers (onCreate)
    ↓
Query closest online driver using geohash
    ↓
Atomic transaction: Claim request (status: 'claimed')
    ↓
Driver sees popup (30-second countdown)
    ↓
Driver responds:
    - Accept → status: 'accepted' (create trip)
    - Decline → status: 'searching' (find next driver)
    - Timeout → status: 'searching' (find next driver)
```

### Key Design Decisions

1. **Cloud Function vs Client-Side**: Use Cloud Functions for driver matching to ensure secure, consistent logic that can't be bypassed
2. **Geohash Strategy**: Use `geofire-common` library for efficient geospatial queries within driver service radius
3. **Atomic Claims**: Use Firestore transactions to prevent race conditions when claiming requests
4. **Timeout Handling**: Cloud Function scheduled to run every 10 seconds to detect and reassign expired claims
5. **State Machine**: Introduce `claimed` status as intermediate state between `searching` and `accepted`

---

## Technical Requirements

### 1. Data Model Updates

#### **Request Interface** (`types/models.ts`)

**Current Status:**
```typescript
status: 'searching' | 'matched' | 'accepted' | 'cancelled'
```

**Updated Status:**
```typescript
status: 'searching' | 'claimed' | 'accepted' | 'cancelled'
```

**New Fields:**
```typescript
export interface Request {
  id: string;
  commuterId: string;
  location: Location;
  dropoffLocation: Location;
  pickupAddress: string;
  dropoffAddress: string;
  serviceType: 'tow';
  status: 'searching' | 'claimed' | 'accepted' | 'cancelled';  // ← Updated
  matchedDriverId?: string;
  claimedByDriverId?: string;      // ← NEW: Driver who has 30-sec window
  claimExpiresAt?: Date;            // ← NEW: Timestamp when claim expires
  notifiedDriverIds?: string[];     // ← NEW: Track who has been offered this request
  createdAt: Date;
  expiresAt: Date;
  commuterName?: string;
  commuterPhone?: string;
  vehicleInfo?: VehicleInfo;
  estimatedPickupDistance?: number;
  estimatedETA?: number;
  totalTripDistance?: number;
  customerNotes?: string;
  estimatedPrice?: number;
}
```

#### **Driver Interface** (`types/models.ts`)

**New Fields for Geolocation:**
```typescript
export interface Driver {
  id: string;
  userId: string;
  isAvailable: boolean;             // Already exists
  isVerified: boolean;
  vehicleInfo: VehicleInfo;
  documents?: DriverDocuments;
  currentLocation: Location;         // Already exists
  geohash?: string;                  // ← NEW: For geospatial queries
  serviceRadius: number;             // Already exists (in miles)
  rating?: number;
  totalTrips: number;
  lastLocationUpdate?: Date;         // ← NEW: Track staleness
  isActivelyDriving?: boolean;       // ← NEW: True when on a trip
}
```

---

### 2. Geolocation Strategy (geofire-common)

**Library**: `geofire-common` (official Firebase geolocation library)

**Installation:**
```bash
npm install geofire-common
```

**Core Concepts:**

1. **Geohash Encoding**: Convert lat/lng into a single string for efficient querying
2. **Radius Queries**: Find all drivers within X miles of request location
3. **Distance Calculation**: Calculate actual distance to sort results

**Implementation Pattern:**

```typescript
// services/firebase/geolocation.ts (NEW FILE)
import * as geofire from 'geofire-common';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';
import { Driver, Location } from '@/types/models';

/**
 * Find available drivers within radius of a location
 * @param center - Location to search from
 * @param radiusMiles - Search radius in miles
 * @returns Array of drivers sorted by distance (closest first)
 */
export async function findNearbyDrivers(
  center: Location,
  radiusMiles: number = 20
): Promise<Array<Driver & { distanceKm: number }>> {
  const radiusKm = radiusMiles * 1.60934; // Convert to km for geofire

  // Calculate geohash query bounds
  const bounds = geofire.geohashQueryBounds(
    [center.latitude, center.longitude],
    radiusKm * 1000 // meters
  );

  const promises = [];
  for (const b of bounds) {
    const q = query(
      collection(db, 'drivers'),
      where('isAvailable', '==', true),
      where('isActivelyDriving', '==', false),
      where('geohash', '>=', b[0]),
      where('geohash', '<=', b[1])
    );
    promises.push(getDocs(q));
  }

  // Execute all geohash range queries in parallel
  const snapshots = await Promise.all(promises);

  const drivers: Array<Driver & { distanceKm: number }> = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const driver = { id: doc.id, ...doc.data() } as Driver;

      // Calculate actual distance to filter out false positives
      const distanceKm = geofire.distanceBetween(
        [center.latitude, center.longitude],
        [driver.currentLocation.latitude, driver.currentLocation.longitude]
      );

      // Only include if within actual radius
      if (distanceKm <= radiusKm) {
        drivers.push({ ...driver, distanceKm });
      }
    }
  }

  // Sort by distance (closest first)
  drivers.sort((a, b) => a.distanceKm - b.distanceKm);

  return drivers;
}

/**
 * Calculate geohash for a location
 * Used when updating driver location
 */
export function calculateGeohash(location: Location): string {
  return geofire.geohashForLocation([
    location.latitude,
    location.longitude
  ]);
}

/**
 * Calculate distance between two locations in miles
 */
export function calculateDistance(
  from: Location,
  to: Location
): number {
  const distanceKm = geofire.distanceBetween(
    [from.latitude, from.longitude],
    [to.latitude, to.longitude]
  );
  return distanceKm * 0.621371; // Convert to miles
}
```

---

### 3. Atomic Claim Logic (Firestore Transactions)

**Purpose**: Prevent race conditions where multiple drivers try to claim the same request simultaneously.

**Implementation:**

```typescript
// services/firebase/firestore.ts (UPDATE EXISTING FILE)

import { runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

/**
 * Atomically claim a request for a driver
 * Returns true if claim successful, false if already claimed
 */
export async function claimRequest(
  requestId: string,
  driverId: string
): Promise<{ success: boolean; reason?: string }> {
  const requestRef = doc(db, 'requests', requestId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const requestDoc = await transaction.get(requestRef);

      if (!requestDoc.exists()) {
        throw new Error('Request not found');
      }

      const request = requestDoc.data();

      // Validate request can be claimed
      if (request.status !== 'searching') {
        return { success: false, reason: 'Request already claimed or accepted' };
      }

      // Check if this driver was already notified (prevent re-assignment to same driver)
      if (request.notifiedDriverIds?.includes(driverId)) {
        return { success: false, reason: 'You already declined this request' };
      }

      // Claim the request
      transaction.update(requestRef, {
        status: 'claimed',
        claimedByDriverId: driverId,
        claimExpiresAt: new Date(Date.now() + 30 * 1000), // 30 seconds from now
        notifiedDriverIds: [...(request.notifiedDriverIds || []), driverId],
      });

      return { success: true };
    });

    return result;
  } catch (error) {
    console.error('Error claiming request:', error);
    throw error;
  }
}

/**
 * Driver accepts a claimed request
 * Creates trip and updates request status
 */
export async function acceptClaimedRequest(
  requestId: string,
  driverId: string
): Promise<string> {
  const requestRef = doc(db, 'requests', requestId);

  try {
    const tripId = await runTransaction(db, async (transaction) => {
      const requestDoc = await transaction.get(requestRef);

      if (!requestDoc.exists()) {
        throw new Error('Request not found');
      }

      const request = requestDoc.data();

      // Validate driver is the one who claimed it
      if (request.claimedByDriverId !== driverId) {
        throw new Error('You are not authorized to accept this request');
      }

      // Validate claim hasn't expired
      if (request.claimExpiresAt && new Date(request.claimExpiresAt.toDate()) < new Date()) {
        throw new Error('Claim has expired');
      }

      // Validate status
      if (request.status !== 'claimed') {
        throw new Error('Request is not in claimed state');
      }

      // Update request to accepted
      transaction.update(requestRef, {
        status: 'accepted',
        matchedDriverId: driverId,
        claimedByDriverId: null,      // Clear claim fields
        claimExpiresAt: null,
      });

      // Create trip document
      const tripRef = doc(collection(db, 'trips'));
      transaction.set(tripRef, {
        requestId: requestId,
        commuterId: request.commuterId,
        driverId: driverId,
        status: 'en_route',
        pickupLocation: request.location,
        dropoffLocation: request.dropoffLocation,
        startTime: serverTimestamp(),
        arrivalTime: null,
        completionTime: null,
        distance: 0,
        estimatedPrice: request.estimatedPrice || 75,
        finalPrice: null,
        driverPath: [],
      });

      return tripRef.id;
    });

    console.log('Trip created:', tripId);
    return tripId;
  } catch (error) {
    console.error('Error accepting request:', error);
    throw error;
  }
}

/**
 * Driver declines a claimed request
 * Returns request to 'searching' status for next driver
 */
export async function declineClaimedRequest(
  requestId: string,
  driverId: string
): Promise<void> {
  const requestRef = doc(db, 'requests', requestId);

  try {
    await runTransaction(db, async (transaction) => {
      const requestDoc = await transaction.get(requestRef);

      if (!requestDoc.exists()) {
        throw new Error('Request not found');
      }

      const request = requestDoc.data();

      // Only the claiming driver can decline
      if (request.claimedByDriverId !== driverId) {
        throw new Error('You are not authorized to decline this request');
      }

      // Return to searching (will trigger reassignment)
      transaction.update(requestRef, {
        status: 'searching',
        claimedByDriverId: null,
        claimExpiresAt: null,
        // notifiedDriverIds remains (driver won't be notified again)
      });
    });

    console.log('Request declined, returning to pool');
  } catch (error) {
    console.error('Error declining request:', error);
    throw error;
  }
}
```

---

### 4. Cloud Functions

**Setup**: Initialize Firebase Functions in the project

```bash
cd /Users/chris/projects/towlink
firebase init functions
# Choose TypeScript
# Install dependencies
```

**File Structure:**
```
functions/
├── src/
│   ├── index.ts                    # Entry point
│   ├── matchDriver.ts              # Request matching logic
│   ├── handleClaimTimeout.ts       # Timeout monitoring
│   └── utils/
│       └── geolocation.ts          # Shared geolocation utilities
├── package.json
└── tsconfig.json
```

#### Function 1: Match Driver on Request Creation

```typescript
// functions/src/matchDriver.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as geofire from 'geofire-common';

// Initialize admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Triggered when a new request is created
 * Finds closest available driver and claims request
 */
export const matchDriverOnRequestCreate = functions.firestore
  .document('requests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    const requestId = context.params.requestId;

    // Only process if status is 'searching'
    if (request.status !== 'searching') {
      console.log('Request not in searching state, skipping');
      return null;
    }

    console.log(`Finding driver for request ${requestId}`);

    try {
      // Find nearby drivers
      const drivers = await findNearbyDrivers(
        request.location,
        20 // 20 mile radius
      );

      // Filter out drivers already notified
      const notifiedIds = request.notifiedDriverIds || [];
      const availableDrivers = drivers.filter(
        d => !notifiedIds.includes(d.id)
      );

      if (availableDrivers.length === 0) {
        console.log('No available drivers found');
        // TODO: Notify commuter no drivers available
        return null;
      }

      // Get closest driver
      const closestDriver = availableDrivers[0];

      console.log(`Assigning to driver ${closestDriver.id}, distance: ${closestDriver.distanceKm}km`);

      // Claim request atomically
      await db.runTransaction(async (transaction) => {
        const requestRef = db.collection('requests').doc(requestId);
        const requestDoc = await transaction.get(requestRef);

        // Double-check still searching (could have been claimed by manual trigger)
        if (requestDoc.data()?.status !== 'searching') {
          throw new Error('Request no longer searching');
        }

        // Claim for driver
        transaction.update(requestRef, {
          status: 'claimed',
          claimedByDriverId: closestDriver.id,
          claimExpiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 1000)
          ),
          notifiedDriverIds: admin.firestore.FieldValue.arrayUnion(closestDriver.id),
          estimatedPickupDistance: Math.round(closestDriver.distanceKm * 0.621371 * 10) / 10, // Convert to miles, round to 1 decimal
        });
      });

      console.log(`Successfully claimed request for driver ${closestDriver.id}`);

      // TODO: Send FCM push notification to driver

      return null;
    } catch (error) {
      console.error('Error matching driver:', error);
      return null;
    }
  });

/**
 * Triggered when request returns to 'searching' status
 * (from decline or timeout)
 */
export const matchDriverOnStatusChange = functions.firestore
  .document('requests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const requestId = context.params.requestId;

    // Check if status changed to 'searching'
    if (before.status !== 'searching' && after.status === 'searching') {
      console.log(`Request ${requestId} returned to searching, finding next driver`);

      // Re-trigger matching logic
      // (Same as onCreate, extracted to shared function)
      // For now, the onCreate function will handle this via trigger
      // In production, extract shared logic to utility function
    }

    return null;
  });

// Helper function (same as client-side geolocation service)
async function findNearbyDrivers(
  location: { latitude: number; longitude: number },
  radiusMiles: number
) {
  const radiusKm = radiusMiles * 1.60934;

  const bounds = geofire.geohashQueryBounds(
    [location.latitude, location.longitude],
    radiusKm * 1000
  );

  const promises = [];
  for (const b of bounds) {
    const q = db.collection('drivers')
      .where('isAvailable', '==', true)
      .where('isActivelyDriving', '==', false)
      .where('geohash', '>=', b[0])
      .where('geohash', '<=', b[1]);
    promises.push(q.get());
  }

  const snapshots = await Promise.all(promises);

  const drivers: any[] = [];

  for (const snap of snapshots) {
    for (const doc of snap.docs) {
      const driver = { id: doc.id, ...doc.data() };

      const distanceKm = geofire.distanceBetween(
        [location.latitude, location.longitude],
        [driver.currentLocation.latitude, driver.currentLocation.longitude]
      );

      if (distanceKm <= radiusKm) {
        drivers.push({ ...driver, distanceKm });
      }
    }
  }

  drivers.sort((a, b) => a.distanceKm - b.distanceKm);

  return drivers;
}
```

#### Function 2: Handle Claim Timeouts

```typescript
// functions/src/handleClaimTimeout.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Scheduled function that runs every 10 seconds
 * Checks for expired claims and returns them to 'searching'
 */
export const handleClaimTimeouts = functions.pubsub
  .schedule('every 10 seconds')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    console.log('Checking for expired claims...');

    try {
      // Query all claimed requests
      const claimedRequests = await db.collection('requests')
        .where('status', '==', 'claimed')
        .get();

      const batch = db.batch();
      let expiredCount = 0;

      for (const doc of claimedRequests.docs) {
        const request = doc.data();

        // Check if claim has expired
        if (request.claimExpiresAt && request.claimExpiresAt.toDate() < now.toDate()) {
          console.log(`Claim expired for request ${doc.id}, returning to searching`);

          batch.update(doc.ref, {
            status: 'searching',
            claimedByDriverId: null,
            claimExpiresAt: null,
            // notifiedDriverIds remains (prevents re-notification)
          });

          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        await batch.commit();
        console.log(`Released ${expiredCount} expired claims`);
      } else {
        console.log('No expired claims found');
      }

      return null;
    } catch (error) {
      console.error('Error handling claim timeouts:', error);
      return null;
    }
  });
```

#### Entry Point

```typescript
// functions/src/index.ts

export { matchDriverOnRequestCreate, matchDriverOnStatusChange } from './matchDriver';
export { handleClaimTimeouts } from './handleClaimTimeout';
```

---

### 5. Client-Side Updates

#### Update Driver Location with Geohash

```typescript
// services/firebase/firestore.ts (UPDATE)

import { calculateGeohash } from './geolocation';

export async function updateDriverAvailability(
  driverId: string,
  isAvailable: boolean,
  currentLocation?: Location
): Promise<void> {
  try {
    const updateData: any = {
      isAvailable: isAvailable,
      updatedAt: Timestamp.now(),
    };

    if (currentLocation) {
      updateData.currentLocation = currentLocation;
      updateData.geohash = calculateGeohash(currentLocation); // NEW
      updateData.lastLocationUpdate = Timestamp.now(); // NEW
    }

    await updateDoc(doc(db, 'drivers', driverId), updateData);

    console.log('Driver status updated:', isAvailable);
  } catch (error) {
    console.error(error);
    throw error;
  }
}
```

#### Real-Time Listener for Claimed Requests

```typescript
// services/firebase/firestore.ts (ADD NEW FUNCTION)

/**
 * Listen for requests claimed by a specific driver
 * Driver will see popup when request is claimed
 */
export function listenForClaimedRequests(
  driverId: string,
  callback: (request: Request | null) => void
) {
  const q = query(
    collection(db, 'requests'),
    where('claimedByDriverId', '==', driverId),
    where('status', '==', 'claimed')
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }

    // Should only be one active claim per driver
    const doc = snapshot.docs[0];
    const request = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate(),
      claimExpiresAt: doc.data().claimExpiresAt?.toDate(),
    } as Request;

    callback(request);
  });
}
```

#### Update Driver Screen

```typescript
// app/(driver)/index.tsx (UPDATE)

// Add listener for claimed requests
useEffect(() => {
  if (!user?.uid || !isOnline) {
    return;
  }

  console.log('Listening for claimed requests...');

  const unsubscribe = listenForClaimedRequests(user.uid, (request) => {
    if (request) {
      console.log('New request claimed:', request.id);
      setCurrentRequest(request);
      setShowPopup(true);
    } else {
      // No active claim
      setCurrentRequest(undefined);
      setShowPopup(false);
    }
  });

  return () => unsubscribe();
}, [user?.uid, isOnline]);

// Update accept handler to use new function
async function handleAcceptRequest() {
  if (!currentRequest || !user?.uid) return;

  try {
    const tripId = await acceptClaimedRequest(currentRequest.id, user.uid);
    Alert.alert('Request Accepted', `Trip ${tripId} created!`);
    setShowPopup(false);
    // TODO: Navigate to active trip screen
  } catch (error: any) {
    Alert.alert('Error', error.message);
  }
}

// Update decline handler to use new function
async function handleDeclineRequest() {
  if (!currentRequest || !user?.uid) return;

  try {
    await declineClaimedRequest(currentRequest.id, user.uid);
    setShowPopup(false);
    // Will automatically trigger reassignment via Cloud Function
  } catch (error: any) {
    Alert.alert('Error', error.message);
    setShowPopup(false);
  }
}
```

---

### 6. Request State Machine

```
┌─────────────┐
│  searching  │ ← Initial state when commuter creates request
└──────┬──────┘
       │
       ├─→ Cloud Function finds closest driver
       │
       ▼
┌─────────────┐
│   claimed   │ ← Driver has 30 seconds to respond
└──────┬──────┘
       │
       ├─→ Accept ──→ ┌──────────┐
       │               │ accepted │ → Create Trip
       │               └──────────┘
       │
       ├─→ Decline ──→ Back to 'searching' → Find next driver
       │
       └─→ Timeout ──→ Back to 'searching' → Find next driver
```

**Status Transitions Table:**

| From | To | Trigger | Action |
|------|-----|---------|--------|
| searching | claimed | Cloud Function matches driver | Set `claimedByDriverId`, `claimExpiresAt` |
| claimed | accepted | Driver taps Accept | Create trip, set `matchedDriverId` |
| claimed | searching | Driver taps Decline | Clear claim fields, trigger reassignment |
| claimed | searching | 30-second timeout | Clear claim fields, trigger reassignment |
| searching | cancelled | Commuter cancels | No reassignment |
| claimed | cancelled | Commuter cancels | Notify driver popup to close |
| accepted | cancelled | Commuter/Driver cancels | Delete trip, refund if applicable |

---

### 7. Firestore Security Rules Updates

```javascript
// firestore.rules (UPDATE)

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Requests
    match /requests/{requestId} {
      // Anyone authenticated can read
      allow read: if request.auth != null;

      // Only commuter can create their own request
      allow create: if request.auth != null
        && request.resource.data.commuterId == request.auth.uid
        && request.resource.data.status == 'searching'; // Can only create in searching state

      // Commuter can cancel their request
      allow update: if request.auth != null
        && resource.data.commuterId == request.auth.uid
        && request.resource.data.status == 'cancelled';

      // Driver can accept/decline if claimed by them
      allow update: if request.auth != null
        && resource.data.claimedByDriverId == request.auth.uid
        && resource.data.status == 'claimed'
        && (request.resource.data.status == 'accepted'
            || request.resource.data.status == 'searching');

      // Cloud Functions can update claim status
      // (Validated by Cloud Function service account)
    }

    // Drivers
    match /drivers/{driverId} {
      // Anyone can read driver profiles
      allow read: if request.auth != null;

      // Only driver themselves can update their profile
      allow update: if request.auth != null
        && request.auth.uid == driverId;

      // Cloud Functions can update for matching
    }

    // Trips (no changes needed for this story)
    match /trips/{tripId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
  }
}
```

---

## Implementation Steps

### Step 1: Update Data Models
**Files**: `/Users/chris/projects/towlink/types/models.ts`

**Action**: Add new fields to `Request` and `Driver` interfaces

**Changes:**
- Add `claimed` status to Request.status union type
- Add `claimedByDriverId`, `claimExpiresAt`, `notifiedDriverIds` to Request
- Add `geohash`, `lastLocationUpdate`, `isActivelyDriving` to Driver

**Test**: Run TypeScript compiler to verify no errors

---

### Step 2: Install Geolocation Dependencies
**Files**: `/Users/chris/projects/towlink/package.json`

**Action**: Install `geofire-common` library

```bash
cd /Users/chris/projects/towlink
npm install geofire-common
```

**Test**: Verify package.json includes `geofire-common`

---

### Step 3: Create Geolocation Service
**Files**: `/Users/chris/projects/towlink/services/firebase/geolocation.ts` (NEW)

**Action**: Create new file with geohash and distance calculation functions

**Code**: Use the implementation from Section 2 above

**Test**: Import functions in firestore.ts to verify no errors

---

### Step 4: Update Driver Location Updates
**Files**: `/Users/chris/projects/towlink/services/firebase/firestore.ts`

**Action**: Modify `updateDriverAvailability()` to include geohash calculation

**Code**: Use updated version from Section 5 above

**Test**:
1. Go online as driver
2. Check Firestore console that driver document has `geohash` field
3. Verify geohash changes when location changes

---

### Step 5: Add Claim/Accept/Decline Functions
**Files**: `/Users/chris/projects/towlink/services/firebase/firestore.ts`

**Action**: Add three new exported functions:
- `claimRequest(requestId, driverId)`
- `acceptClaimedRequest(requestId, driverId)`
- `declineClaimedRequest(requestId, driverId)`

**Code**: Use implementations from Section 3 above

**Test**: Create unit tests or manual Firestore console tests

---

### Step 6: Add Real-Time Listener for Claims
**Files**: `/Users/chris/projects/towlink/services/firebase/firestore.ts`

**Action**: Add `listenForClaimedRequests(driverId, callback)` function

**Code**: Use implementation from Section 5 above

**Test**: Manually claim a request in Firestore console, verify callback fires

---

### Step 7: Initialize Firebase Functions
**Command**:
```bash
cd /Users/chris/projects/towlink
firebase init functions
```

**Selections:**
- Language: TypeScript
- ESLint: Yes
- Install dependencies: Yes

**Action**:
1. Run init command
2. Verify `functions/` directory created
3. Install `geofire-common` in functions:
   ```bash
   cd functions
   npm install geofire-common
   ```

**Test**: Run `npm run build` in functions directory

---

### Step 8: Create Cloud Function for Driver Matching
**Files**:
- `/Users/chris/projects/towlink/functions/src/matchDriver.ts` (NEW)
- `/Users/chris/projects/towlink/functions/src/index.ts` (UPDATE)

**Action**:
1. Create matchDriver.ts with `matchDriverOnRequestCreate` function
2. Export from index.ts

**Code**: Use implementation from Section 4 above

**Test**:
1. Deploy function: `firebase deploy --only functions`
2. Create request as commuter
3. Check function logs: `firebase functions:log`

---

### Step 9: Create Cloud Function for Claim Timeouts
**Files**:
- `/Users/chris/projects/towlink/functions/src/handleClaimTimeout.ts` (NEW)
- `/Users/chris/projects/towlink/functions/src/index.ts` (UPDATE)

**Action**:
1. Create handleClaimTimeout.ts with scheduled function
2. Export from index.ts

**Code**: Use implementation from Section 4 above

**Test**:
1. Deploy function
2. Manually claim a request with expired timestamp
3. Wait 10 seconds, verify it returns to searching

---

### Step 10: Update Driver Screen with Real-Time Listener
**Files**: `/Users/chris/projects/towlink/app/(driver)/index.tsx`

**Action**:
1. Add useEffect to listen for claimed requests
2. Update accept/decline handlers to use new functions
3. Remove test button logic (replace with real flow)

**Code**: Use updates from Section 5 above

**Test**:
1. Create request as commuter
2. Go online as driver
3. Verify popup appears automatically
4. Test accept flow
5. Test decline flow
6. Test timeout (wait 30 seconds without responding)

---

### Step 11: Update Commuter Screen to Show Status
**Files**: `/Users/chris/projects/towlink/app/(commuter)/index.tsx`

**Action**: Add real-time listener to show when request is claimed

**Code**:
```typescript
// Listen for request status changes
useEffect(() => {
  if (!requestId) return;

  const unsubscribe = onSnapshot(
    doc(db, 'requests', requestId),
    (snapshot) => {
      const data = snapshot.data();
      if (data?.status === 'claimed') {
        // Show "Driver found! Waiting for response..."
      } else if (data?.status === 'accepted') {
        // Show "Driver accepted!"
      }
    }
  );

  return () => unsubscribe();
}, [requestId]);
```

**Test**: Create request, watch status updates in UI

---

### Step 12: Update Firestore Security Rules
**Files**: Use Firebase Console or `firestore.rules` file

**Action**: Add rules from Section 7 above

**Test**:
1. Try to claim request as wrong driver (should fail)
2. Try to accept unclaimed request (should fail)
3. Verify legitimate operations succeed

---

### Step 13: Update RequestPopup Timer Logic
**Files**: `/Users/chris/projects/towlink/components/RequestPopup.tsx`

**Action**: Use `claimExpiresAt` from request instead of local 30-second timer

**Code**:
```typescript
// Calculate time left based on claimExpiresAt
useEffect(() => {
  if (!visible || !request?.claimExpiresAt) {
    setTimeLeft(30);
    return;
  }

  const calculateTimeLeft = () => {
    const now = new Date().getTime();
    const expiresAt = new Date(request.claimExpiresAt).getTime();
    const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
    setTimeLeft(secondsLeft);
  };

  calculateTimeLeft(); // Initial calculation
  const interval = setInterval(calculateTimeLeft, 1000);

  return () => clearInterval(interval);
}, [visible, request]);
```

**Test**: Verify timer syncs with Firestore timestamp

---

### Step 14: Add Composite Indexes
**Action**: Create Firestore indexes for geohash queries

**Indexes Needed:**
```
Collection: drivers
Fields: isAvailable (Ascending), isActivelyDriving (Ascending), geohash (Ascending)

Collection: requests
Fields: status (Ascending), claimedByDriverId (Ascending)
```

**How**:
1. Firebase Console → Firestore → Indexes
2. Or deploy with `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "drivers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isAvailable", "order": "ASCENDING" },
        { "fieldPath": "isActivelyDriving", "order": "ASCENDING" },
        { "fieldPath": "geohash", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Test**: Run geohash query, verify no "index required" errors

---

### Step 15: Integration Testing
**Action**: End-to-end test of the full flow

**Test Scenarios:**
1. **Happy Path**: Commuter creates request → Driver receives popup → Driver accepts → Trip created
2. **Decline Path**: Driver declines → Next closest driver receives popup
3. **Timeout Path**: Driver doesn't respond for 30s → Request reassigned
4. **No Drivers**: Create request when no drivers online → Request stays in searching
5. **Multiple Requests**: Create multiple requests → Each driver gets only one at a time
6. **Race Condition**: Two drivers try to accept same request → Only one succeeds

**Tools**:
- Use two devices/simulators (one commuter, one driver)
- Check Firestore console for data integrity
- Monitor Cloud Function logs

---

## Edge Cases

### 1. No Drivers Available
**Scenario**: Commuter creates request but no drivers are online within radius

**Handling**:
- Request remains in `searching` status
- Cloud Function logs "No available drivers"
- Commuter UI shows "Searching for drivers..." indefinitely
- After 10 minutes (request.expiresAt), request automatically cancelled
- Future: Notify commuter "No drivers available in your area"

---

### 2. Driver Goes Offline While Claimed
**Scenario**: Request is claimed by driver, but driver force-quits app or loses connection

**Handling**:
- Timeout function (runs every 10 seconds) will release claim after 30 seconds
- Request returns to `searching` and finds next driver
- Driver's `isAvailable` is set to false on app quit (existing logic in driver screen)

---

### 3. Commuter Cancels During Claim
**Scenario**: Request is claimed by driver, commuter cancels before driver responds

**Handling**:
- Request status changes to `cancelled`
- Driver's listener detects status change, closes popup
- Add to RequestPopup.tsx:
```typescript
useEffect(() => {
  if (request?.status === 'cancelled') {
    Alert.alert('Request Cancelled', 'The customer cancelled this request');
    onDecline(); // Close popup
  }
}, [request?.status]);
```

---

### 4. Stale Driver Locations
**Scenario**: Driver went offline hours ago, but `isAvailable` is still true in Firestore

**Handling**:
- Add `lastLocationUpdate` timestamp when updating location
- In Cloud Function, filter out drivers with stale locations:
```typescript
const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
const recentDrivers = drivers.filter(d =>
  d.lastLocationUpdate?.toDate().getTime() > fiveMinutesAgo
);
```
- Future: Cloud Function to auto-offline drivers with no location update in 5 minutes

---

### 5. Driver Receives Request Outside Service Radius
**Scenario**: Driver's serviceRadius is 10 miles, but request is 15 miles away

**Handling**:
- Current implementation: Cloud Function searches fixed 20-mile radius
- Better: Use driver's actual serviceRadius in query
- Update findNearbyDrivers to respect individual driver settings:
```typescript
// In Cloud Function, after getting drivers
const driversInRange = drivers.filter(d => {
  const driverServiceRadiusKm = d.serviceRadius * 1.60934;
  return d.distanceKm <= driverServiceRadiusKm;
});
```

---

### 6. Race Condition: Two Drivers Accept Same Request
**Scenario**: Two drivers somehow both have request claimed (shouldn't happen, but defensive coding)

**Handling**:
- Transaction in `acceptClaimedRequest` validates `claimedByDriverId` matches
- Second driver's accept will fail with error "You are not authorized"
- UI shows error alert
- Second driver's claim is already released by first driver's acceptance

---

### 7. Network Failure During Accept
**Scenario**: Driver taps Accept, but network request fails

**Handling**:
- Show error alert: "Failed to accept request. Please try again."
- Request remains in `claimed` status
- Driver can retry Accept button
- If timeout expires, request is released
- Add retry logic:
```typescript
async function handleAcceptRequest() {
  try {
    setIsAccepting(true);
    await acceptClaimedRequest(requestId, driverId);
    // Success
  } catch (error) {
    if (error.message.includes('expired')) {
      Alert.alert('Timeout', 'This request has expired');
      setShowPopup(false);
    } else {
      Alert.alert('Error', 'Failed to accept. Please try again.');
      // Keep popup open for retry
    }
  } finally {
    setIsAccepting(false);
  }
}
```

---

### 8. Driver Already on a Trip
**Scenario**: Driver is actively on a trip but somehow receives another request

**Handling**:
- Add `isActivelyDriving` field to Driver model
- Set to `true` when trip status is `en_route`, `arrived`, or `in_progress`
- Set to `false` when trip status is `completed` or `cancelled`
- Cloud Function filters out drivers with `isActivelyDriving: true`
- Update in trip state changes:
```typescript
// When trip created
await updateDoc(doc(db, 'drivers', driverId), {
  isActivelyDriving: true
});

// When trip completed/cancelled
await updateDoc(doc(db, 'drivers', driverId), {
  isActivelyDriving: false
});
```

---

## Testing Strategy

### Unit Tests (Future - Phase 4)
- Test geohash calculation accuracy
- Test distance calculation accuracy
- Test claim transaction logic
- Test timeout detection logic

### Integration Tests
**Manual Testing Checklist:**
1. ✅ Create request as commuter
2. ✅ Verify Cloud Function triggers
3. ✅ Verify closest driver receives claim
4. ✅ Verify popup appears on driver screen
5. ✅ Verify timer counts down
6. ✅ Test accept flow → trip created
7. ✅ Test decline flow → next driver notified
8. ✅ Test timeout → next driver notified
9. ✅ Test with no drivers online
10. ✅ Test with multiple drivers at different distances
11. ✅ Test commuter cancels during claim
12. ✅ Test driver goes offline during claim

### Performance Tests
- Create 10 simultaneous requests → Verify all matched within 5 seconds
- Test with 100 drivers in database → Verify query completes in <2 seconds
- Monitor Cloud Function execution time (should be <3 seconds)

### Firestore Console Validation
- Verify `geohash` field populated on driver documents
- Verify `claimedByDriverId` and `claimExpiresAt` set correctly
- Verify `notifiedDriverIds` array grows on each reassignment
- Verify no orphaned claims (status=claimed with expired timestamp)

---

## Dependencies

### NPM Packages
- ✅ `geofire-common` - Geospatial queries (install in both root and functions/)
- ✅ `firebase-functions` - Already in devDependencies
- ✅ `firebase-admin` - Auto-installed with functions init

### Firebase Setup
- ✅ Firebase project already configured
- 🔲 Firebase Functions initialized (Step 7)
- 🔲 Cloud Scheduler enabled for timeout function
- 🔲 Firestore composite indexes created (Step 14)

### Existing Features
- ✅ Driver online/offline toggle (TOW-50)
- ✅ Driver location tracking (TOW-50)
- ✅ Request creation (TOW-51)
- ✅ RequestPopup component (TOW-51)
- ✅ Driver document initialization (TOW-50)

### Future Features (Not in Scope)
- ⏳ FCM push notifications (nice-to-have, but popup appears via real-time listener)
- ⏳ Multiple simultaneous requests per driver (Phase 3)
- ⏳ Priority/rating-based matching (Phase 3)
- ⏳ Background location tracking when app backgrounded (Phase 3)

---

## Performance Considerations

### Firestore Reads
- **Per Request Creation**:
  - Geohash query: ~5-20 reads (depending on number of drivers)
  - Transaction read: 1 read
  - **Total**: ~6-21 reads per request

- **Per Timeout Check** (every 10 seconds):
  - Query claimed requests: 1 read per claimed request (usually 0-5)
  - Batch update: 1 write per expired claim
  - **Total**: Negligible (most cycles find 0 claims)

### Real-Time Listeners
- **Per Online Driver**: 1 active listener for claimed requests
- **Per Active Request**: No listeners needed (Cloud Function handles matching)
- **Optimization**: Use `limit(1)` on driver listener (only one claim at a time)

### Cloud Function Costs
- **onCreate Trigger**: $0.40 per million invocations
- **Scheduled Function**: 6 invocations/minute × 60 min × 24 hr = 8,640/day
  - Monthly: ~259,200 invocations (~$0.10/month)
- **Firestore Operations**: Main cost driver (see above)

### Optimization Strategies
1. **Limit geohash query radius**: Start with 20 miles, expand if no drivers
2. **Cache driver locations**: Consider using Redis for high-volume scenarios (overkill for MVP)
3. **Batch timeout checks**: Current implementation uses batch writes (efficient)
4. **Index optimization**: Composite indexes make queries fast

---

## Security Considerations

### Authentication Requirements
- All operations require authenticated user (`request.auth != null`)
- Driver can only claim/accept requests assigned to them
- Commuter can only create requests for themselves
- Cloud Functions use service account (bypasses rules)

### Data Validation
- Transactions validate request status before updates
- Claim expiration checked before acceptance
- Driver authorization checked in all operations

### Privacy Concerns
- Driver locations exposed to matching algorithm (necessary)
- Driver locations NOT exposed to commuters until matched (privacy preserved)
- Request locations only visible to assigned driver

### Rate Limiting (Future)
- Prevent spam request creation (limit 1 request per 30 seconds per user)
- Prevent rapid accept/decline cycles (not in current scope)

---

## Rollout Plan

### Phase 1: Development & Testing (Current Sprint)
1. Implement all 15 steps above
2. Test on emulators with mock data
3. Manual testing with 2 devices

### Phase 2: Staging Deployment
1. Deploy Cloud Functions to production Firebase project
2. Test with real users (Chris as commuter, classmate as driver)
3. Monitor Cloud Function logs for errors

### Phase 3: Production Monitoring
1. Set up Firebase Performance Monitoring
2. Monitor Firestore usage in Firebase Console
3. Track function execution times
4. Collect user feedback

### Phase 4: Optimization (Future Sprint)
1. Add FCM push notifications
2. Optimize geohash query radius based on real-world data
3. Add analytics for match success rate
4. Implement fallback for "no drivers available" scenario

---

## Success Metrics

### Functional Requirements
- ✅ Only one driver sees each request at a time
- ✅ Claim expires after 30 seconds
- ✅ Request reassigned on decline or timeout
- ✅ No race conditions (transaction-based claiming)
- ✅ Closest driver matched first

### Performance Metrics
- **Match Time**: <5 seconds from request creation to driver notification
- **Claim Success Rate**: >90% of claims result in accept (not timeout/decline)
- **Function Execution Time**: <3 seconds for matching function
- **Query Performance**: Geohash query completes in <2 seconds

### User Experience
- Driver sees popup within 5 seconds of request creation
- Timer counts down accurately
- Accept/decline actions feel instant (<1 second)
- No confusing error messages

---

## Future Enhancements (Post-TOW-52)

### Immediate Next Stories
- **TOW-53**: Trip active state and driver navigation
- **TOW-54**: Commuter real-time tracking of driver location
- **TOW-55**: Trip completion and payment flow

### Matching Algorithm Improvements
1. **Multi-factor Scoring**:
   - Distance (primary)
   - Driver rating (secondary)
   - Driver acceptance rate (secondary)
   - Response time history (tertiary)

2. **Smart Reassignment**:
   - Predict likelihood of acceptance based on distance
   - Notify 2-3 drivers simultaneously if low confidence
   - Dynamic timeout based on driver history (fast acceptors get less time)

3. **Geographic Optimization**:
   - Cache driver clusters in high-density areas
   - Predictive pre-assignment based on traffic patterns
   - Zone-based matching for urban areas

### Monitoring & Analytics
- Dashboard showing match success rate
- Average time to match
- Driver response patterns
- Geographic heatmaps of requests vs driver availability

---

## Notes for Code Coach

### Learning Objectives for Student
This story teaches several advanced concepts:

1. **Geospatial Queries**: Understanding geohash encoding and radius queries
2. **Distributed Transactions**: Preventing race conditions in concurrent systems
3. **Cloud Functions**: Server-side logic triggered by database events
4. **State Machines**: Managing complex status transitions
5. **Real-Time Systems**: Coordinating multiple clients through Firestore listeners
6. **Scheduled Tasks**: Periodic cleanup and maintenance functions

### Coaching Approach
- **Start Simple**: Implement client-side functions first (Steps 1-6)
- **Build Incrementally**: Add Cloud Functions one at a time (Steps 7-9)
- **Test Thoroughly**: Use Firestore console to verify data integrity
- **Debug Together**: Cloud Function logs can be tricky; teach debugging strategies

### Common Pitfalls
1. **Forgetting to update geohash**: Driver locations must update geohash on every position change
2. **Transaction complexity**: Transactions can be confusing; explain atomic operations clearly
3. **Timestamp handling**: Firestore timestamps vs JavaScript Dates
4. **Listener cleanup**: Must unsubscribe to prevent memory leaks

### Recommended Implementation Order
1. Data models (Step 1) - Foundation
2. Geolocation service (Steps 2-3) - Core utility
3. Client-side functions (Steps 4-6) - Can test manually
4. Cloud Functions (Steps 7-9) - Complex but powerful
5. UI updates (Steps 10-11) - Brings it all together
6. Testing & refinement (Steps 12-15) - Ensure quality

---

**Estimated Implementation Time**: 12-16 hours over 3-4 days
**Story Points**: 8 (accurate for complexity and scope)
**Priority**: HIGH - Blocking for all future driver-matching features

---

_Specification Author: technical-architect agent_
_Created: 2026-02-19_
_Story: TOW-52_
