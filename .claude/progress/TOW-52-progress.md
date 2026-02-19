# Lesson Plan: TOW-52 - Request Assignment & Claiming Logic

## Overview
This lesson teaches you how to build a **distributed matching system** that connects commuters with the closest available driver using advanced Firebase features. This is your first deep dive into geospatial queries, atomic transactions, and Cloud Functions.

**Story Points**: 8 (Complex)
**Estimated Learning Time**: 12-16 hours over 3-4 days
**Jira**: [TOW-52](https://chriskelamyan115.atlassian.net/browse/TOW-52)

---

## Learning Objectives

By the end of this story, you will understand:

1. **Geospatial Data Structures**: How geohashes convert 2D coordinates into queryable strings
2. **Proximity Queries**: How to efficiently find "things near me" in a database
3. **Distributed Concurrency**: How to prevent race conditions when multiple users act simultaneously
4. **Atomic Transactions**: How Firestore transactions guarantee data consistency
5. **Cloud Functions**: How to run server-side logic triggered by database changes
6. **State Machines**: How to manage complex status transitions with clear rules
7. **Scheduled Tasks**: How to run periodic cleanup jobs in the cloud

These are **professional-grade concepts** used in production systems like Uber, DoorDash, and Lyft.

---

## Prerequisites - What You Should Already Understand

Before starting, make sure you're comfortable with:

- ✅ React hooks (useState, useEffect)
- ✅ Firebase Firestore CRUD operations (create, read, update)
- ✅ Real-time listeners (onSnapshot)
- ✅ TypeScript interfaces
- ✅ Async/await patterns
- ✅ Basic Firebase Security Rules

**New Concepts** (we'll learn together):
- 🆕 Geohash encoding and proximity queries
- 🆕 Firestore transactions (`runTransaction`)
- 🆕 Cloud Functions (onCreate triggers, scheduled functions)
- 🆕 State machines with intermediate states

---

## The Big Picture: What We're Building

### Problem Statement
**Without a claiming system:**
- 10 drivers see the same request
- All 10 try to accept it
- 9 drivers get errors
- Confusing experience for everyone

**With our claiming system:**
- Only 1 driver sees the request at a time (the closest one)
- That driver has 30 seconds to respond
- If they decline or timeout, it automatically goes to the next driver
- No confusion, no race conditions

### The Flow
```
Commuter: "I need a tow!" → Request created (status: 'searching')
    ↓
Cloud Function: "Finding closest driver..." → Query by geohash
    ↓
System: "Found Driver A at 2.3 miles away" → Claim atomically (status: 'claimed')
    ↓
Driver A: Sees popup, has 30 seconds to respond
    ↓
Option 1: Driver A accepts → Create trip (status: 'accepted')
Option 2: Driver A declines → Find Driver B (back to 'searching')
Option 3: Driver A ignores → Timeout after 30s → Find Driver B (back to 'searching')
```

---

## Concept Deep Dives

### Concept 1: Geohashes - Encoding Location as Text

**The Problem**: You can't query "find all drivers within 5 miles of me" in Firestore efficiently.

**Why Not?**
Firestore can only filter on ONE field with inequality operators. You'd need:
- latitude >= 42.3 AND latitude <= 42.5
- longitude >= -71.1 AND longitude <= -71.0

That's TWO inequality filters. Firestore says "nope!"

**The Solution**: Geohash

A geohash converts a 2D coordinate (latitude, longitude) into a **single string** where nearby locations have similar strings.

**Example:**
```
Boston (42.3601, -71.0589) → "drt2yq"
Cambridge (42.3736, -71.1097) → "drt2yt"  ← Notice similarity!
New York (40.7128, -74.0060) → "dr5reg"   ← Very different!
```

**Key Insight**: Locations that are geographically close have geohashes that share a common prefix.

This means we can query:
```typescript
where('geohash', '>=', 'drt2')
where('geohash', '<=', 'drt3')
```

And find all drivers in the Boston area with ONE compound query!

**How It Works:**
1. When driver updates location → calculate geohash → store in driver document
2. When looking for nearby drivers → calculate geohash bounds for radius → query drivers in those bounds
3. Filter results by actual distance (geohash gives false positives at edges)

**Library**: We use `geofire-common` (official Firebase library) to handle all the complex math.

**Learning Resources:**
- [Geohash Explorer](http://geohash.org/) - Visualize geohashes
- [Firebase Geoqueries Docs](https://firebase.google.com/docs/firestore/solutions/geoqueries)

**Knowledge Check Questions:**
1. Why can't we just use latitude/longitude directly in Firestore queries?
2. What does a geohash represent?
3. Why do we need to filter by actual distance after the geohash query?

---

### Concept 2: Atomic Transactions - Preventing Race Conditions

**The Problem**: What happens when two drivers try to claim the same request at exactly the same time?

**Without Transactions:**
```
Driver A reads request: status = 'searching' ✓
Driver B reads request: status = 'searching' ✓
Driver A updates: claimedByDriverId = 'A'
Driver B updates: claimedByDriverId = 'B'
Result: BOTH think they claimed it! 💥
```

**With Transactions:**
```
Driver A starts transaction
  - Read request: status = 'searching'
  - Update: claimedByDriverId = 'A', status = 'claimed'
  - COMMIT ✓
Driver B starts transaction
  - Read request: status = 'claimed' (changed by A!)
  - Condition check fails
  - ABORT ❌
Result: Only Driver A gets it! ✓
```

**How Firestore Transactions Work:**
1. Start transaction
2. Read documents (creates a snapshot)
3. Make changes (in memory, not saved yet)
4. Commit:
   - Firestore checks if documents changed since read
   - If YES → retry transaction (or abort after 5 tries)
   - If NO → apply all changes atomically

**Key Rules:**
- Must read before writing
- All reads happen first (snapshot at single point in time)
- All writes happen at the end (atomically)
- Transaction may retry automatically

**Code Pattern:**
```typescript
await runTransaction(db, async (transaction) => {
  // 1. READ phase - get current state
  const doc = await transaction.get(docRef);
  const data = doc.data();

  // 2. VALIDATE - check conditions
  if (data.status !== 'searching') {
    return { success: false }; // Abort this transaction
  }

  // 3. WRITE phase - make changes
  transaction.update(docRef, {
    status: 'claimed',
    claimedByDriverId: driverId
  });

  // 4. RETURN - transaction commits after this
  return { success: true };
});
```

**Learning Resources:**
- [Firestore Transactions Docs](https://firebase.google.com/docs/firestore/manage-data/transactions)
- Think of it like a database "lock" but better

**Knowledge Check Questions:**
1. What happens if two transactions try to modify the same document?
2. Why do we read before writing in a transaction?
3. What does "atomic" mean in this context?

---

### Concept 3: Cloud Functions - Server-Side Logic

**The Problem**: We can't trust the client (mobile app) to:
- Pick the closest driver fairly
- Enforce timeout rules
- Prevent cheating (driver pretends to be closest)

**The Solution**: Run critical logic on Google's servers, not the phone.

**Types of Cloud Functions We'll Use:**

**1. onCreate Trigger**
```typescript
functions.firestore
  .document('requests/{requestId}')
  .onCreate(async (snap, context) => {
    // This runs automatically when a new request is created!
    const request = snap.data();
    const requestId = context.params.requestId;

    // Find closest driver
    // Claim the request
  });
```

**2. Scheduled Function**
```typescript
functions.pubsub
  .schedule('every 10 seconds')
  .onRun(async (context) => {
    // This runs every 10 seconds, like a cron job

    // Find expired claims
    // Release them back to 'searching'
  });
```

**Why Cloud Functions?**
- **Security**: Client can't fake being the closest driver
- **Consistency**: Same logic runs for everyone
- **Reliability**: Runs even if client crashes
- **Performance**: Access to entire database (not limited by security rules)

**How They Work:**
1. You write the function code (TypeScript)
2. Deploy to Firebase: `firebase deploy --only functions`
3. Firebase hosts it on Google Cloud Platform
4. Triggered by events (onCreate) or schedule (cron)
5. Logs visible in Firebase Console

**Learning Resources:**
- [Firebase Functions Get Started](https://firebase.google.com/docs/functions/get-started)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)

**Knowledge Check Questions:**
1. Why can't we do driver matching on the client app?
2. What triggers the onCreate function to run?
3. How often does the scheduled function check for timeouts?

---

### Concept 4: State Machines - Managing Complex Workflows

**What is a State Machine?**
A state machine defines:
- **States**: The possible statuses (searching, claimed, accepted)
- **Transitions**: Valid moves between states
- **Guards**: Conditions that must be true for transition
- **Actions**: What happens during transition

**Our Request State Machine:**

```
┌─────────────┐
│  searching  │ ← Initial state
└──────┬──────┘
       │
       │ Transition: Cloud Function finds driver
       │ Guard: Driver exists, is online, not on trip
       │ Action: Set claimedByDriverId, claimExpiresAt
       │
       ▼
┌─────────────┐
│   claimed   │ ← Intermediate state (30-second window)
└──────┬──────┘
       │
       ├─→ Transition: Driver accepts
       │   Guard: Driver is claimer, claim not expired
       │   Action: Create trip, set matchedDriverId
       │   Next State: 'accepted'
       │
       ├─→ Transition: Driver declines
       │   Guard: Driver is claimer
       │   Action: Clear claim fields
       │   Next State: 'searching' (loops back)
       │
       └─→ Transition: Timeout (30 seconds)
           Guard: claimExpiresAt < now
           Action: Clear claim fields
           Next State: 'searching' (loops back)
```

**Why Use a State Machine?**
- **Clarity**: Everyone understands what states exist
- **Safety**: Prevents invalid transitions (can't go from 'searching' to 'accepted')
- **Debugging**: Easy to see where things got stuck
- **Documentation**: The diagram IS the spec

**Implementation Pattern:**
```typescript
// Before transitioning, always validate current state
if (request.status !== 'claimed') {
  throw new Error('Cannot accept request that is not claimed');
}

// Validate guards
if (request.claimedByDriverId !== driverId) {
  throw new Error('You are not the assigned driver');
}

// Perform transition
transaction.update(requestRef, {
  status: 'accepted',  // New state
  matchedDriverId: driverId
});
```

**Learning Resources:**
- State machines are used everywhere: traffic lights, elevators, game AI
- [XState Visualizer](https://stately.ai/viz) - Play with state machines

**Knowledge Check Questions:**
1. What are the three main states in our request lifecycle?
2. What happens if a request is in 'claimed' state for >30 seconds?
3. Why can't we go directly from 'searching' to 'accepted'?

---

## Step-by-Step Implementation Plan

### Phase 1: Foundation (Data & Utilities)
**Goal**: Set up the data structures and helper functions you'll need.

#### Step 1: Update TypeScript Interfaces
**Concepts**: Data modeling, type safety

**Tasks:**
1. Open `/Users/chris/projects/towlink/types/models.ts`
2. Add new status to Request: `'claimed'`
3. Add three new fields to Request:
   - `claimedByDriverId?: string`
   - `claimExpiresAt?: Date`
   - `notifiedDriverIds?: string[]`
4. Add three new fields to Driver:
   - `geohash?: string`
   - `lastLocationUpdate?: Date`
   - `isActivelyDriving?: boolean`

**Why These Fields?**
- `claimedByDriverId`: Track who has the 30-second window
- `claimExpiresAt`: Know when to timeout
- `notifiedDriverIds`: Prevent offering same request to driver twice
- `geohash`: Enable proximity queries
- `lastLocationUpdate`: Detect stale driver locations
- `isActivelyDriving`: Don't assign requests to drivers already on a trip

**Test:** Run `npx tsc --noEmit` to verify no TypeScript errors.

**Estimated Time**: 15 minutes

---

#### Step 2: Install Geolocation Library
**Concepts**: Package management, dependencies

**Tasks:**
```bash
cd /Users/chris/projects/towlink
npm install geofire-common
```

**What is geofire-common?**
- Official Firebase library for geospatial queries
- Handles geohash encoding/decoding
- Calculates distances between coordinates
- Generates query bounds for radius searches

**Test:** Check `package.json` includes `"geofire-common": "^6.x.x"`

**Estimated Time**: 5 minutes

---

#### Step 3: Create Geolocation Service
**Concepts**: Geohashes, proximity queries, service layer

**Tasks:**
1. Create new file: `/Users/chris/projects/towlink/services/firebase/geolocation.ts`
2. Implement three functions:
   - `findNearbyDrivers(center, radiusMiles)` → Driver[] sorted by distance
   - `calculateGeohash(location)` → string
   - `calculateDistance(from, to)` → number in miles

**Learning Opportunity**: This is your first time working with geohashes!

**How findNearbyDrivers Works:**
1. Convert miles to kilometers (geofire uses metric)
2. Calculate geohash bounds for the radius
3. Query Firestore for drivers in those bounds (may need multiple queries)
4. Filter by actual distance (geohash gives approximate results)
5. Sort by distance (closest first)

**Code Structure:**
```typescript
import * as geofire from 'geofire-common';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';

export async function findNearbyDrivers(
  center: Location,
  radiusMiles: number = 20
): Promise<Array<Driver & { distanceKm: number }>> {
  // TODO: Implement using spec Section 2 as reference
}
```

**Reference**: See technical spec Section 2 for complete implementation.

**Test:**
1. Create a test driver document in Firestore with `geohash` field
2. Call `findNearbyDrivers` from a test component
3. Verify it returns the driver sorted by distance

**Estimated Time**: 45 minutes

**Knowledge Check:**
- What does `geohashQueryBounds` return?
- Why might we need multiple Firestore queries for one geohash search?
- What's the difference between geohash distance and actual distance?

---

#### Step 4: Update Driver Location to Include Geohash
**Concepts**: Data enrichment, computed fields

**Tasks:**
1. Open `/Users/chris/projects/towlink/services/firebase/firestore.ts`
2. Find `updateDriverAvailability()` function
3. Import `calculateGeohash` from `./geolocation`
4. Add geohash calculation when location is provided:

```typescript
if (currentLocation) {
  updateData.currentLocation = currentLocation;
  updateData.geohash = calculateGeohash(currentLocation);  // NEW
  updateData.lastLocationUpdate = Timestamp.now();         // NEW
}
```

**Why This Matters:**
Every time a driver moves, we recalculate their geohash. This keeps the proximity queries accurate.

**Test:**
1. Go to driver screen, toggle "Go Online"
2. Check Firestore console
3. Verify driver document has `geohash` field (looks like "drt2yq")
4. Move to different location, verify geohash changes

**Estimated Time**: 20 minutes

**Knowledge Check:**
- When does the geohash get calculated?
- What happens if we forget to update the geohash when location changes?

---

### Phase 2: Atomic Claiming Logic (Client-Side)
**Goal**: Learn transactions by implementing claim/accept/decline functions.

#### Step 5: Implement Claim Functions
**Concepts**: Firestore transactions, atomic operations, validation

**Tasks:**
1. Stay in `/Users/chris/projects/towlink/services/firebase/firestore.ts`
2. Add three new exported functions:

**Function 1: `claimRequest(requestId, driverId)`**
- Use `runTransaction` to atomically claim
- Validate request is in 'searching' status
- Check driver hasn't already been notified
- Update to 'claimed' status with expiration

**Function 2: `acceptClaimedRequest(requestId, driverId)`**
- Use `runTransaction` to atomically accept
- Validate driver is the claimer
- Validate claim hasn't expired
- Update request to 'accepted'
- Create trip document in same transaction

**Function 3: `declineClaimedRequest(requestId, driverId)`**
- Use `runTransaction` to atomically decline
- Validate driver is the claimer
- Return request to 'searching' (triggers reassignment)

**Learning Opportunity**: This is your first time writing transactions!

**Transaction Pattern:**
```typescript
await runTransaction(db, async (transaction) => {
  // 1. READ - Get current state
  const doc = await transaction.get(requestRef);
  const data = doc.data();

  // 2. VALIDATE - Check guards
  if (data.status !== 'claimed') {
    throw new Error('Invalid state');
  }

  // 3. UPDATE - Make changes
  transaction.update(requestRef, { /* changes */ });

  // 4. RETURN - Commits after function returns
  return { success: true };
});
```

**Reference**: See technical spec Section 3 for complete implementations.

**Test:**
1. Manually create a request in Firestore (status: 'searching')
2. Call `claimRequest(requestId, testDriverId)` from a test component
3. Check Firestore: status should be 'claimed', claimExpiresAt should be ~30 seconds in future
4. Try calling `claimRequest` again with different driver → should fail
5. Call `acceptClaimedRequest` → should create trip, update to 'accepted'

**Estimated Time**: 90 minutes

**Knowledge Check:**
- What happens if you call `acceptClaimedRequest` but the claim expired?
- Why do we validate the driver ID matches `claimedByDriverId`?
- What happens if two drivers call `claimRequest` at the exact same millisecond?

---

#### Step 6: Add Real-Time Listener for Claims
**Concepts**: Real-time listeners, reactive UI

**Tasks:**
1. Add new function to `firestore.ts`:

```typescript
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
      callback(null); // No active claim
      return;
    }

    const doc = snapshot.docs[0]; // Should only be one
    const request = { id: doc.id, ...doc.data() } as Request;
    callback(request);
  });
}
```

**Why This Matters:**
When Cloud Function claims a request for this driver, this listener fires immediately and shows the popup. No polling needed!

**Test:**
1. Call `listenForClaimedRequests(driverId, (req) => console.log(req))`
2. Manually claim a request for that driver in Firestore console
3. Verify callback fires with request data
4. Change status to 'accepted' in console
5. Verify callback fires with `null`

**Estimated Time**: 30 minutes

**Knowledge Check:**
- Why do we filter by both `claimedByDriverId` AND `status`?
- What happens when the request status changes from 'claimed' to 'accepted'?

---

### Phase 3: Cloud Functions (Server-Side Logic)
**Goal**: Learn Cloud Functions by implementing server-side matching and timeout handling.

#### Step 7: Initialize Firebase Functions
**Concepts**: Cloud Functions setup, project structure

**Tasks:**
```bash
cd /Users/chris/projects/towlink
firebase init functions
```

**Selections:**
- What language? → **TypeScript**
- Use ESLint? → **Yes**
- Install dependencies? → **Yes**

**What This Creates:**
```
functions/
├── src/
│   └── index.ts        # Entry point for functions
├── package.json        # Separate dependencies from main app
├── tsconfig.json       # TypeScript config for functions
└── .eslintrc.js        # Linting rules
```

**Install Dependencies:**
```bash
cd functions
npm install geofire-common
cd ..
```

**Test:**
```bash
cd functions
npm run build  # Compiles TypeScript
cd ..
```

**Estimated Time**: 15 minutes

**Knowledge Check:**
- Why does functions have its own package.json?
- What version of Node.js do Cloud Functions use?

---

#### Step 8: Create Driver Matching Cloud Function
**Concepts**: onCreate triggers, geospatial queries in Cloud Functions

**Tasks:**
1. Create `/Users/chris/projects/towlink/functions/src/matchDriver.ts`
2. Implement `matchDriverOnRequestCreate` function
3. Export from `index.ts`

**What This Function Does:**
1. Triggers when any document is created in `requests/` collection
2. Checks if status is 'searching' (ignore others)
3. Finds nearby drivers using geohash query
4. Filters out drivers already notified
5. Picks closest driver
6. Atomically claims request for that driver

**Learning Opportunity**: This is Cloud Functions + geohashes + transactions all together!

**Code Structure:**
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as geofire from 'geofire-common';

admin.initializeApp();
const db = admin.firestore();

export const matchDriverOnRequestCreate = functions.firestore
  .document('requests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    const requestId = context.params.requestId;

    // TODO: Implement matching logic
  });
```

**Key Differences from Client Code:**
- Use `admin.firestore()` instead of `firebase/firestore`
- Use `admin.firestore.Timestamp` instead of `Timestamp`
- No security rules (Cloud Functions have full database access)

**Reference**: See technical spec Section 4 for complete implementation.

**Test:**
1. Deploy: `firebase deploy --only functions`
2. Create a driver with geohash in Firestore
3. Create a request (status: 'searching')
4. Check function logs: `firebase functions:log`
5. Verify request was claimed for that driver

**Estimated Time**: 90 minutes

**Knowledge Check:**
- When does this function trigger?
- Why do we filter out `notifiedDriverIds`?
- What happens if no drivers are found within radius?

---

#### Step 9: Create Timeout Handling Cloud Function
**Concepts**: Scheduled functions, batch operations, cron jobs

**Tasks:**
1. Create `/Users/chris/projects/towlink/functions/src/handleClaimTimeout.ts`
2. Implement scheduled function that runs every 10 seconds
3. Export from `index.ts`

**What This Function Does:**
1. Runs every 10 seconds (like a cron job)
2. Queries all requests with status = 'claimed'
3. Checks if `claimExpiresAt` has passed
4. Releases expired claims back to 'searching' (triggers reassignment)

**Learning Opportunity**: First scheduled function!

**Code Structure:**
```typescript
export const handleClaimTimeouts = functions.pubsub
  .schedule('every 10 seconds')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();

    // Query claimed requests
    const claimedRequests = await db.collection('requests')
      .where('status', '==', 'claimed')
      .get();

    // Check for expired claims
    // Use batch update for efficiency
  });
```

**Reference**: See technical spec Section 4 for complete implementation.

**Test:**
1. Deploy: `firebase deploy --only functions`
2. Manually claim a request with expiration in the past
3. Wait 10-20 seconds
4. Check logs: `firebase functions:log`
5. Verify request returned to 'searching'

**Estimated Time**: 60 minutes

**Knowledge Check:**
- Why every 10 seconds instead of every 1 second?
- What's the difference between a batch and a transaction?
- What happens if this function crashes halfway through?

---

### Phase 4: UI Integration
**Goal**: Connect everything to the user interface.

#### Step 10: Update Driver Screen with Real-Time Listener
**Concepts**: React hooks, real-time UI updates, useEffect cleanup

**Tasks:**
1. Open `/Users/chris/projects/towlink/app/(tabs)/driver.tsx`
2. Add useEffect to listen for claimed requests
3. Update accept/decline handlers to use new transaction functions
4. Remove test button (replaced by real flow)

**Code Pattern:**
```typescript
useEffect(() => {
  if (!user?.uid || !isOnline) {
    return;
  }

  console.log('Listening for claimed requests...');

  const unsubscribe = listenForClaimedRequests(user.uid, (request) => {
    if (request) {
      console.log('Request claimed for me:', request.id);
      setCurrentRequest(request);
      setShowPopup(true);
    } else {
      setCurrentRequest(undefined);
      setShowPopup(false);
    }
  });

  return () => unsubscribe(); // Cleanup!
}, [user?.uid, isOnline]);
```

**Why Cleanup Matters:**
If you don't unsubscribe, the listener keeps running even after component unmounts. Memory leak!

**Test:**
1. Go online as driver
2. Create request as commuter
3. Popup should appear automatically on driver screen
4. Test accept → trip should be created
5. Test decline → popup should close, request returns to pool

**Estimated Time**: 45 minutes

**Knowledge Check:**
- When does the listener start?
- What happens if the driver goes offline?
- Why is the cleanup function important?

---

#### Step 11: Update RequestPopup Timer
**Concepts**: Syncing UI with server timestamps

**Tasks:**
1. Open `/Users/chris/projects/towlink/components/RequestPopup.tsx`
2. Update timer logic to use `request.claimExpiresAt` instead of local countdown

**Why This Matters:**
The claim expiration is set by the Cloud Function. The UI timer should reflect the actual server timestamp, not just count down from 30.

**Code Pattern:**
```typescript
useEffect(() => {
  if (!visible || !request?.claimExpiresAt) {
    setTimeLeft(30);
    return;
  }

  const calculateTimeLeft = () => {
    const now = Date.now();
    const expiresAt = request.claimExpiresAt.getTime();
    const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
    setTimeLeft(secondsLeft);

    if (secondsLeft === 0) {
      onTimeout(); // Auto-close on timeout
    }
  };

  calculateTimeLeft(); // Initial
  const interval = setInterval(calculateTimeLeft, 1000);

  return () => clearInterval(interval);
}, [visible, request?.claimExpiresAt]);
```

**Test:**
1. Claim a request manually in Firestore with `claimExpiresAt` 15 seconds in future
2. Open driver app
3. Timer should show ~15 seconds (not 30)
4. Wait for it to hit 0
5. Popup should close automatically

**Estimated Time**: 30 minutes

---

#### Step 12: Update Commuter Screen Status Display
**Concepts**: Real-time status updates, user feedback

**Tasks:**
1. Open `/Users/chris/projects/towlink/app/(tabs)/commuter.tsx`
2. Add listener for request status changes
3. Show different messages for 'searching', 'claimed', 'accepted'

**User Experience:**
- Status: 'searching' → "Searching for drivers..."
- Status: 'claimed' → "Driver found! Waiting for response..."
- Status: 'accepted' → "Driver accepted! They're on their way!"

**Code Pattern:**
```typescript
useEffect(() => {
  if (!requestId) return;

  const unsubscribe = onSnapshot(
    doc(db, 'requests', requestId),
    (snapshot) => {
      const data = snapshot.data();

      if (data?.status === 'searching') {
        setStatusMessage('Searching for drivers...');
      } else if (data?.status === 'claimed') {
        setStatusMessage('Driver found! Waiting for response...');
      } else if (data?.status === 'accepted') {
        setStatusMessage('Driver accepted! They\'re on their way!');
      }
    }
  );

  return () => unsubscribe();
}, [requestId]);
```

**Test:**
1. Create request as commuter
2. Watch status message change in real-time
3. Manually update status in Firestore console
4. Verify UI updates immediately

**Estimated Time**: 30 minutes

---

### Phase 5: Testing & Refinement
**Goal**: Verify everything works end-to-end and handle edge cases.

#### Step 13: Update Firestore Security Rules
**Concepts**: Security rules, authorization, Cloud Functions permissions

**Tasks:**
1. Open Firebase Console → Firestore → Rules
2. Update rules to allow driver claim operations
3. Allow Cloud Functions to modify requests (they bypass rules anyway)

**Key Rules to Add:**
```javascript
// Driver can accept/decline if claimed by them
allow update: if request.auth != null
  && resource.data.claimedByDriverId == request.auth.uid
  && resource.data.status == 'claimed'
  && (request.resource.data.status == 'accepted'
      || request.resource.data.status == 'searching');
```

**Why This Matters:**
Security rules prevent unauthorized access. Only the assigned driver can accept/decline their claimed request.

**Reference**: See technical spec Section 7 for complete rules.

**Test:**
1. Try to accept request as wrong driver → should fail with permission error
2. Accept as correct driver → should succeed
3. Try to claim request directly from client → should fail (only Cloud Function can claim)

**Estimated Time**: 30 minutes

---

#### Step 14: Create Firestore Indexes
**Concepts**: Database indexes, query optimization

**Tasks:**
1. Firebase Console → Firestore → Indexes
2. Create composite index:
   - Collection: `drivers`
   - Fields: `isAvailable` (ASC), `isActivelyDriving` (ASC), `geohash` (ASC)

**Why This Matters:**
Firestore requires composite indexes for queries that filter on multiple fields. Without this index, geohash queries will fail.

**How to Create:**
1. Option A: Click the error link when you first run the query
2. Option B: Manually create in console
3. Option C: Use `firestore.indexes.json` file (see spec Section 14)

**Test:**
1. Create request
2. Check Cloud Function logs
3. Verify no "index required" errors

**Estimated Time**: 15 minutes

---

#### Step 15: End-to-End Integration Testing
**Concepts**: System testing, edge cases, debugging

**Tasks:**
Test all scenarios to ensure the system works correctly.

**Test Scenarios:**

**1. Happy Path**
- Commuter creates request
- Cloud Function finds closest driver
- Driver receives popup
- Driver accepts
- Trip is created
- ✓ Success!

**2. Decline Flow**
- Driver A declines
- Request returns to 'searching'
- Cloud Function finds Driver B
- Driver B receives popup
- ✓ Reassignment works!

**3. Timeout Flow**
- Driver doesn't respond
- Wait 30+ seconds
- Timeout function releases claim
- Request returns to 'searching'
- Next driver receives popup
- ✓ Timeout works!

**4. No Drivers Available**
- Create request when no drivers online
- Request stays in 'searching'
- No errors in Cloud Function logs
- ✓ Graceful handling!

**5. Multiple Requests**
- Create 3 requests from 3 commuters
- Each driver gets only one popup at a time
- ✓ No spam!

**6. Race Condition Test**
- Two drivers try to accept same request
- Only one succeeds
- Other gets error message
- ✓ Transactions working!

**7. Commuter Cancels During Claim**
- Request claimed
- Commuter cancels
- Driver popup closes automatically
- ✓ Real-time sync working!

**Debugging Tips:**
- Use `firebase functions:log` to see Cloud Function logs
- Check Firestore console for data integrity
- Use `console.log` liberally in development
- Test on two physical devices for realism

**Estimated Time**: 120 minutes (2 hours)

**Knowledge Check:**
- What happens if Cloud Function fails halfway through?
- How do you verify a transaction worked correctly?
- What's the difference between an error and an edge case?

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: Forgetting to Update Geohash
**Problem**: Driver location updates but geohash stays old → proximity queries return wrong results

**Solution**: Always call `calculateGeohash()` when location changes
```typescript
updateData.geohash = calculateGeohash(currentLocation);
```

**How to Debug**: Check driver document in Firestore, verify geohash changes when location changes

---

### Pitfall 2: Timestamp Confusion
**Problem**: JavaScript `Date` vs Firestore `Timestamp` cause errors

**In Client Code:**
```typescript
import { Timestamp } from 'firebase/firestore';
claimExpiresAt: Timestamp.fromDate(new Date(Date.now() + 30000))
```

**In Cloud Functions:**
```typescript
import * as admin from 'firebase-admin';
claimExpiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30000))
```

**When Reading:**
```typescript
const expiresAt = doc.data().claimExpiresAt.toDate(); // Convert to JS Date
```

---

### Pitfall 3: Listener Memory Leaks
**Problem**: Forgetting to unsubscribe → component keeps listening even after unmount

**Solution**: Always return cleanup function
```typescript
useEffect(() => {
  const unsubscribe = listenForClaimedRequests(...);
  return () => unsubscribe(); // This is critical!
}, [deps]);
```

**How to Debug**: Check for duplicate console.logs when navigating back and forth

---

### Pitfall 4: Transaction Retries
**Problem**: Transaction might run multiple times if there's contention

**Solution**: Make transaction code idempotent (safe to run multiple times)
```typescript
// Good: Checks current state
if (data.status !== 'searching') {
  return { success: false }; // Don't modify if already changed
}

// Bad: Blindly updates
transaction.update(ref, { status: 'claimed' }); // Might claim twice!
```

---

### Pitfall 5: Cloud Function Cold Starts
**Problem**: First function call after idle period takes 5-10 seconds

**Solution**: This is normal! Firebase keeps functions warm if they run frequently. In production, use "minimum instances" setting (costs money).

**For Testing**: Be patient on first test. Subsequent calls will be fast.

---

## Knowledge Check - Final Quiz

Before considering this story complete, answer these questions:

### Geohash Questions
1. What problem does geohash solve for proximity queries?
2. Why do we filter by actual distance after the geohash query?
3. What happens if we forget to update the geohash when driver moves?

### Transaction Questions
4. What makes a transaction "atomic"?
5. What happens if two drivers try to claim the same request simultaneously?
6. Why do we read before writing in a transaction?

### Cloud Function Questions
7. Why can't we do driver matching on the client app?
8. What triggers the `matchDriverOnRequestCreate` function?
9. How often does the timeout function check for expired claims?

### State Machine Questions
10. What are the three main states in our request lifecycle?
11. What happens when a request is in 'claimed' state for >30 seconds?
12. Can a request go directly from 'searching' to 'accepted'? Why/why not?

### System Design Questions
13. What happens if a driver goes offline while they have a claimed request?
14. What happens if Cloud Function finds no available drivers?
15. How does the system prevent the same driver from receiving the same request twice?

**Answer Key**: Discuss with your coding coach or refer to the spec for detailed explanations.

---

## Resources for Deeper Learning

### Official Documentation
- [Firestore Geoqueries](https://firebase.google.com/docs/firestore/solutions/geoqueries)
- [Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Cloud Functions Get Started](https://firebase.google.com/docs/functions/get-started)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)

### Interactive Tools
- [Geohash Explorer](http://geohash.org/) - Visualize geohashes
- [XState Visualizer](https://stately.ai/viz) - Understand state machines
- [Firebase Console](https://console.firebase.google.com) - Monitor functions and data

### Conceptual Reading
- [How Uber Matches Drivers](https://eng.uber.com/tech-stack-part-one-foundation/)
- [Distributed Transactions Explained](https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html)
- [State Machines for User Interfaces](https://statecharts.dev/)

---

## Implementation Progress Tracker

**Mark each step as complete when you've:**
1. Implemented the code
2. Tested it works
3. Understand why it works

### Phase 1: Foundation
- [ ] Step 1: Update TypeScript Interfaces (15 min)
- [ ] Step 2: Install Geolocation Library (5 min)
- [ ] Step 3: Create Geolocation Service (45 min)
- [ ] Step 4: Update Driver Location with Geohash (20 min)

### Phase 2: Atomic Claiming Logic
- [ ] Step 5: Implement Claim Functions (90 min)
- [ ] Step 6: Add Real-Time Listener for Claims (30 min)

### Phase 3: Cloud Functions
- [ ] Step 7: Initialize Firebase Functions (15 min)
- [ ] Step 8: Create Driver Matching Cloud Function (90 min)
- [ ] Step 9: Create Timeout Handling Cloud Function (60 min)

### Phase 4: UI Integration
- [ ] Step 10: Update Driver Screen with Real-Time Listener (45 min)
- [ ] Step 11: Update RequestPopup Timer (30 min)
- [ ] Step 12: Update Commuter Screen Status Display (30 min)

### Phase 5: Testing & Refinement
- [ ] Step 13: Update Firestore Security Rules (30 min)
- [ ] Step 14: Create Firestore Indexes (15 min)
- [ ] Step 15: End-to-End Integration Testing (120 min)

**Total Estimated Time**: 12-14 hours

---

## Current Status

**Last Updated**: 2026-02-19
**Current Step**: Not started (awaiting student to begin)
**Blockers**: None

**Notes**:
This is a comprehensive lesson plan designed to teach advanced Firebase concepts incrementally. The student should take their time to understand each concept before moving to the next step. Don't rush - these are professional-grade techniques that take time to master.

Remember: The goal is **learning**, not just completing the story. If you get stuck, that's part of the process. Ask questions, experiment, and debug. You're building real-world skills that will serve you for years to come.

---

## Next Steps After TOW-52

Once you complete this story, you'll be ready for:
- **TOW-53**: Trip active state and driver navigation
- **TOW-54**: Commuter real-time tracking of driver location
- **TOW-55**: Trip completion and payment flow

These stories build directly on the claiming logic you're learning here. Master this, and the rest will feel much easier!

---

_Lesson Plan Created by: Claude Code (code-coach mode)_
_Technical Spec by: technical-architect agent_
_Story Points: 8_
_Estimated Completion: 3-4 days of focused work_
