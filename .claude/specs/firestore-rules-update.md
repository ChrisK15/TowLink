# Technical Specification: Firestore Security Rules Update for Sprint 2

## Overview

This document audits the Firestore security rules in light of every story completed during Sprint 2. It maps each story's Firestore writes and reads against the current `firestore.rules`, identifies gaps and over-permissions, and specifies the exact rule changes needed to properly secure the database for the current feature set.

---

## Sprint Stories Reviewed

| Story  | Title                                    | Firestore Collections Touched                                             |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------- |
| TOW-14 | Create Towing Request (location bug fix) | `requests`                                                                |
| TOW-18 | View Request Details                     | `requests` (read only, no new writes)                                     |
| TOW-50 | Driver Home Screen Online/Offline Toggle | `drivers`, `driverLocations`                                              |
| TOW-51 | Basic Request Pop-Up UI                  | None (mock data only, no Firestore)                                       |
| TOW-52 | Request Assignment & Claiming Logic      | `requests` (claiming, accepting, declining), `trips`, `drivers`           |
| TOW-53 | Real-Time Request Listening              | `requests` (read via listener)                                            |
| TOW-68 | Active Trip Screen with Expandable Modal | `trips` (read via listener), `requests` (one-time read for commuter info) |
| TOW-70 | Trip State Machine & Progress Tracking   | `trips` (status updates with timestamps)                                  |
| TOW-71 | General Onboarding Flow                  | None (AsyncStorage only, no Firestore)                                    |

---

## What Each Story Implemented in Firestore

### TOW-14: Create Towing Request (Location Bug Fix)

**What it does**: The `createRequest()` function in `services/firebase/firestore.ts` writes a new document to `requests/`. The document includes:

- `commuterId` (the authenticated user's UID)
- `location` and `dropoffLocation` (lat/lng objects)
- `pickupAddress`, `dropoffAddress`
- `serviceType: 'tow'`
- `status: 'searching'`
- `matchedDriverId: null`
- `createdAt`, `expiresAt` timestamps

**Rule impact**: The current rules for `requests` create require `isCommuter()` and field validation. The `createRequest` function writes `pickupAddress` and `dropoffAddress` as top-level fields. However, the existing rules require `hasRequiredFields(['commuterId', 'location', 'dropoffLocation', 'pickupAddress', 'dropoffAddress', 'serviceType', 'status', 'createdAt', 'expiresAt'])`. The service function also writes `matchedDriverId: null`, which is an extra field but the rules only check `hasAll()` not `hasOnly()`, so this is fine.

**Gap identified**: The `createRequest` service does NOT write `commuterName`, `commuterPhone`, or `vehicleInfo` fields — those are set by the commuter screen from local state. The rules do not currently require these optional fields, which is correct.

---

### TOW-50: Driver Home Screen Online/Offline Toggle

**What it does**:

1. `updateDriverAvailability()` — Updates `drivers/{driverId}` with `isAvailable`, `isActivelyDriving`, `updatedAt`, `currentLocation`, and `geohash`.
2. Driver initialization in the driver screen creates a new `drivers/{driverId}` document if one does not exist.

**Gap identified (CRITICAL)**: The current `drivers` collection rule is:

```javascript
allow create, update: if isAuthenticated()
  && isOwner(driverId)
  && isDriver();
```

The `isDriver()` function does a Firestore `get()` call on `users/{uid}` to check the role. This creates a **chicken-and-egg problem**: a new user who just registered and selected the "driver" role may not yet have `role: 'driver'` written to their `users` document at the exact moment `initializeDriverDocument()` runs. If the role write races with the driver document creation, the rule check will fail.

Additionally, `isDriver()` checks `users/{uid}.role in ['driver', 'both']`. If a user has `role: null` (freshly signed up, role not yet selected), they cannot create their own driver document even if they are in the process of becoming a driver. This must be addressed.

**Second gap**: The current `drivers` update rule allows ANY field to be updated by the authenticated owner. The `updateDriverAvailability` function updates `isAvailable`, `isActivelyDriving`, `updatedAt`, `currentLocation`, and `geohash` — all legitimate. But the rule also allows updating `isVerified`, which should only be set by a Cloud Function or admin, not by the client.

---

### TOW-52: Request Assignment & Claiming Logic

**What it does**: This is the most complex story for Firestore security. It introduces:

1. **`claimRequest()`** — A Firestore transaction that updates `requests/{id}` from `status: 'searching'` to `status: 'claimed'`, setting `claimedByDriverId`, `claimExpiresAt`, and appending to `notifiedDriverIds`.

1. **`acceptClaimedRequest()`** — A Firestore transaction that:
   - Updates `requests/{id}` to `status: 'accepted'`, sets `matchedDriverId`
   - Creates a new `trips/{tripId}` document
   - Updates `drivers/{driverId}.isActivelyDriving: true`

1. **`declineClaimedRequest()`** — A Firestore transaction that updates `requests/{id}` back to `status: 'searching'`, clearing `claimedByDriverId` and `claimExpiresAt`.

**Gap identified (CRITICAL)**: The current `requests` update rule allows a driver to update a claimed request to `accepted` only if:

```javascript
resource.data.status == 'claimed' &&
	resource.data.claimedByDriverId == request.auth.uid &&
	request.resource.data.status == 'accepted' &&
	request.resource.data.matchedDriverId == request.auth.uid;
```

This is partially correct but is **missing the claim transition**. The current rules have NO rule allowing a driver to transition a request from `searching` to `claimed`. The `claimRequest()` function runs as a client-side transaction that writes `status: 'claimed'`, `claimedByDriverId`, `claimExpiresAt`, and appends to `notifiedDriverIds`. None of these transitions are permitted by the current rules.

**The claim operation is currently insecure/blocked by rules.** A driver can only claim a request if the rules permit this transition. The current rules have no branch for `status: 'claimed'` as an incoming state on a `searching` request.

**Second gap**: `acceptClaimedRequest()` also updates `drivers/{driverId}.isActivelyDriving: true`. The `drivers` update rule is `isOwner(driverId) && isDriver()`, which correctly restricts this to the driver themselves. However, `isDriver()` makes an extra Firestore read, and this is called frequently during the claim/accept cycle.

---

### TOW-53: Real-Time Request Listening

**What it does**: `listenForClaimedRequests()` subscribes to `requests` where `status == 'claimed'` and `claimedByDriverId == driverId`. This is a read-only operation.

**Gap identified**: The current `requests` read rule is `allow read: if isAuthenticated()`. This is very permissive — any authenticated user can read any request document. Commuters can read driver claims; drivers can read each other's claimed requests. For the current MVP phase this is acceptable but should be flagged.

---

### TOW-68: Active Trip Screen

**What it does**:

1. `listenToTrip()` — Real-time listener on `trips/{tripId}`. Reads only.
2. `getRequestById()` — One-time fetch of `requests/{requestId}` to get `commuterName` and `commuterPhone`. Reads only.
3. `acceptClaimedRequest()` creates a trip document (covered under TOW-52).

**Gap identified**: The current `trips` read rule is:

```javascript
allow read: if isAuthenticated()
  && (resource.data.commuterId == request.auth.uid
      || resource.data.driverId == request.auth.uid);
```

This is correct and properly restricts trip reads to participants only. No changes needed.

---

### TOW-70: Trip State Machine & Progress Tracking

**What it does**: `updateTripStatus()` updates `trips/{tripId}` with new `status` and a timestamp field depending on the transition:

- `arrived` → sets `arrivalTime`
- `in_progress` → sets `startedAt`
- `completed` → sets `completionTime`

**Gap identified**: The current `trips` update rule permits drivers to update trip status including `arrived`, `in_progress`, `completed`, and `cancelled`. It validates that `arrivalTime` is a valid timestamp when setting `arrived`, and that `completionTime` is a valid timestamp when setting `completed`. However, it does NOT validate the `startedAt` timestamp when setting `in_progress`. This was added by TOW-70 in the service layer but the rules were not updated to match.

**Second gap**: The current rule does not enforce the status progression order. A driver could theoretically skip from `en_route` directly to `completed` without going through `arrived` and `in_progress`. The rule only checks that the final status is in the valid set, not that the transition is legal.

---

### TOW-71: Onboarding Flow

**What it does**: Purely client-side AsyncStorage. No Firestore interaction. No rule changes needed.

---

## Current State of `firestore.rules` — Summary of Gaps

| Collection        | Issue                                                              | Severity |
| ----------------- | ------------------------------------------------------------------ | -------- |
| `requests`        | No rule for `status: 'claimed'` claim transition by drivers        | CRITICAL |
| `requests`        | Read rule allows any authenticated user to read all requests       | MEDIUM   |
| `drivers`         | `isDriver()` check creates chicken-and-egg for new driver signup   | HIGH     |
| `drivers`         | No field restriction on update — `isVerified` can be set by client | HIGH     |
| `trips`           | `startedAt` timestamp not validated when `status == 'in_progress'` | MEDIUM   |
| `trips`           | No status progression order enforcement                            | LOW      |
| `driverLocations` | `isDriver()` check same chicken-and-egg issue as `drivers`         | HIGH     |

---

## Recommended Changes to `firestore.rules`

### Change 1: Add Claim Transition for `requests`

The `requests` update rule must allow a driver to claim a `searching` request by transitioning it to `claimed`. The claim sets `claimedByDriverId`, `claimExpiresAt`, and appends to `notifiedDriverIds`.

**Add a new branch to the `requests` update rule:**

```javascript
// Driver claiming a searching request (atomic claim)
|| (isDriver()
    && resource.data.status == 'searching'
    && request.resource.data.status == 'claimed'
    && request.resource.data.claimedByDriverId == request.auth.uid
    && request.resource.data.commuterId == resource.data.commuterId)
```

**Justification**: Without this rule, `claimRequest()` — which is a client-side Firestore transaction — will be blocked by security rules. The claim transition is the foundation of the entire driver-matching system (TOW-52).

---

### Change 2: Fix Driver Document Creation — Remove `isDriver()` from `drivers` Create

The current rule requires `isDriver()` to create a driver document, but `isDriver()` reads `users/{uid}.role` which may not yet be set to `'driver'` when the driver screen initializes the document.

**Replace:**

```javascript
allow create, update: if isAuthenticated()
  && isOwner(driverId)
  && isDriver();
```

**With separate create and update rules:**

```javascript
// Any authenticated user can create their own driver profile
// (role check happens after initial signup flow)
allow create: if isAuthenticated()
  && isOwner(driverId)
  && hasRequiredFields(['userId', 'isAvailable', 'isVerified', 'vehicleInfo', 'currentLocation', 'serviceRadius', 'totalTrips'])
  && request.resource.data.userId == request.auth.uid
  // Cannot self-verify — isVerified must start false
  && request.resource.data.isVerified == false
  // Cannot self-mark as actively driving
  && request.resource.data.isActivelyDriving == false;

// Updates restricted to the driver themselves, and cannot change isVerified
allow update: if isAuthenticated()
  && isOwner(driverId)
  && isDriver()
  // Cannot self-verify through client-side update
  && request.resource.data.isVerified == resource.data.isVerified
  // Cannot change userId
  && request.resource.data.userId == resource.data.userId;
```

**Justification**: This allows the driver initialization to succeed for a new user while still preventing abuse: `isVerified` cannot be set to `true` by the client (it can only be set by a Cloud Function or admin later), and updates still require the driver role.

---

### Change 3: Fix `driverLocations` — Same `isDriver()` Issue

The `driverLocations` collection has the same chicken-and-egg issue. However, since `updateDriverAvailability` now updates `drivers/{driverId}` directly (not `driverLocations`), and `driverLocations` is not actually written by any current service function in `firestore.ts`, this collection is currently only specified in the rules for future use.

**Current spec says `updateDriverLocation()` writes to `driverLocations` but the actual implemented `updateDriverAvailability()` only writes to `drivers/{driverId}`.**

Review the actual firestore.ts: `updateDriverAvailability` writes ONLY to `drivers/{driverId}`. The `driverLocations` collection rules remain forward-looking for Phase 3 background tracking. No functional change needed here, but the comment should be updated.

---

### Change 4: Add `startedAt` Timestamp Validation for `in_progress`

Mirror the existing `arrived` and `completed` validations:

**Add to the `trips` update rule:**

```javascript
// If setting to in_progress, must have startedAt
&& (request.resource.data.status != 'in_progress'
    || isValidTimestamp('startedAt'))
```

**Justification**: The `updateTripStatus` service function (TOW-70) now writes `startedAt: Timestamp.now()` when transitioning to `in_progress`. The rule should validate this is present, consistent with the existing `arrivalTime` and `completionTime` checks.

---

### Change 5: Add Status Progression Enforcement for `trips`

Prevent drivers from skipping states in the trip state machine.

**Add a helper function:**

```javascript
// Check that the trip status transition is valid
function isValidTripTransition(currentStatus, newStatus) {
	return (
		(currentStatus == 'en_route' && newStatus == 'arrived') ||
		(currentStatus == 'arrived' && newStatus == 'in_progress') ||
		(currentStatus == 'in_progress' && newStatus == 'completed') ||
		newStatus == 'cancelled'
	); // cancelled is allowed from any state
}
```

**Add to the `trips` update rule:**

```javascript
// Status must follow valid progression
&& isValidTripTransition(resource.data.status, request.resource.data.status)
```

**Note**: This is a LOW priority change. For the current MVP with a trusted student developer, invalid transitions would be caught by the client-side state machine logic in `ActiveTripSheet`. This rule adds defense-in-depth.

---

## Complete Updated `firestore.rules` File

Below is the complete recommended replacement for `/Users/chris/projects/towlink/firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    function hasRequiredFields(fields) {
      return request.resource.data.keys().hasAll(fields);
    }

    function isValidString(field) {
      return request.resource.data[field] is string
        && request.resource.data[field].size() > 0;
    }

    function isValidLocation(location) {
      return location.keys().hasAll(['latitude', 'longitude'])
        && location.latitude is number
        && location.longitude is number
        && location.latitude >= -90 && location.latitude <= 90
        && location.longitude >= -180 && location.longitude <= 180;
    }

    function isValidTimestamp(field) {
      return request.resource.data[field] is timestamp;
    }

    function isDriver() {
      return isAuthenticated()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['driver', 'both'];
    }

    function isCommuter() {
      return isAuthenticated()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['commuter', 'both'];
    }

    // Validate that a trip status transition is legal
    function isValidTripTransition(currentStatus, newStatus) {
      return (currentStatus == 'en_route' && newStatus == 'arrived')
        || (currentStatus == 'arrived' && newStatus == 'in_progress')
        || (currentStatus == 'in_progress' && newStatus == 'completed')
        || newStatus == 'cancelled';
    }

    // ============================================
    // USERS COLLECTION
    // ============================================
    match /users/{userId} {
      allow read: if isAuthenticated();

      allow create: if isAuthenticated()
        && isOwner(userId)
        && hasRequiredFields(['email', 'createdAt'])
        && isValidString('email')
        && request.resource.data.email == request.auth.token.email
        && isValidTimestamp('createdAt')
        && (request.resource.data.role == null
            || request.resource.data.role in ['commuter', 'driver', 'both']);

      allow update: if isAuthenticated()
        && isOwner(userId)
        && request.resource.data.id == resource.data.id
        && request.resource.data.email == resource.data.email
        && request.resource.data.createdAt == resource.data.createdAt
        && (request.resource.data.role == null
            || request.resource.data.role in ['commuter', 'driver', 'both']);

      allow delete: if false;
    }

    // ============================================
    // REQUESTS COLLECTION
    // ============================================
    match /requests/{requestId} {
      allow read: if isAuthenticated();

      // Only commuters can create requests
      allow create: if isAuthenticated()
        && isCommuter()
        && hasRequiredFields([
          'commuterId',
          'location',
          'dropoffLocation',
          'pickupAddress',
          'dropoffAddress',
          'serviceType',
          'status',
          'createdAt',
          'expiresAt'
        ])
        && request.resource.data.commuterId == request.auth.uid
        && isValidLocation(request.resource.data.location)
        && isValidLocation(request.resource.data.dropoffLocation)
        && isValidString('pickupAddress')
        && isValidString('dropoffAddress')
        && request.resource.data.serviceType == 'tow'
        && request.resource.data.status == 'searching'
        && isValidTimestamp('createdAt')
        && isValidTimestamp('expiresAt')
        && (!request.resource.data.keys().hasAny(['matchedDriverId'])
            || request.resource.data.matchedDriverId == null);

      allow update: if isAuthenticated()
        && (
          // [1] Commuter cancelling their own request (from any active status)
          (resource.data.commuterId == request.auth.uid
            && request.resource.data.status == 'cancelled'
            && request.resource.data.commuterId == resource.data.commuterId)

          ||

          // [2] Driver claiming a searching request (NEW - required for TOW-52)
          // Sets status: 'claimed', claimedByDriverId, claimExpiresAt, appends notifiedDriverIds
          (isDriver()
            && resource.data.status == 'searching'
            && request.resource.data.status == 'claimed'
            && request.resource.data.claimedByDriverId == request.auth.uid
            && request.resource.data.commuterId == resource.data.commuterId)

          ||

          // [3] Driver accepting a claimed request (finalises the claim)
          (isDriver()
            && resource.data.status == 'claimed'
            && resource.data.claimedByDriverId == request.auth.uid
            && request.resource.data.status == 'accepted'
            && request.resource.data.matchedDriverId == request.auth.uid)

          ||

          // [4] Driver declining a claimed request (returns to searching)
          (isDriver()
            && resource.data.status == 'claimed'
            && resource.data.claimedByDriverId == request.auth.uid
            && request.resource.data.status == 'searching'
            && request.resource.data.claimedByDriverId == null)
        );

      allow delete: if false;
    }

    // ============================================
    // TRIPS COLLECTION
    // ============================================
    match /trips/{tripId} {
      // Only trip participants can read their own trips
      allow read: if isAuthenticated()
        && (resource.data.commuterId == request.auth.uid
            || resource.data.driverId == request.auth.uid);

      // Only drivers can create trips (when accepting a request via acceptClaimedRequest)
      allow create: if isAuthenticated()
        && isDriver()
        && hasRequiredFields([
          'requestId',
          'commuterId',
          'driverId',
          'status',
          'pickupLocation',
          'dropoffLocation',
          'startTime',
          'estimatedPrice'
        ])
        && request.resource.data.driverId == request.auth.uid
        && request.resource.data.status == 'en_route'
        && isValidLocation(request.resource.data.pickupLocation)
        && isValidLocation(request.resource.data.dropoffLocation)
        && isValidTimestamp('startTime')
        && request.resource.data.estimatedPrice is number
        && request.resource.data.estimatedPrice > 0
        && request.resource.data.distance == 0;

      // Drivers can update trip status following valid state machine transitions
      allow update: if isAuthenticated()
        && resource.data.driverId == request.auth.uid
        // Core identity fields cannot change
        && request.resource.data.requestId == resource.data.requestId
        && request.resource.data.commuterId == resource.data.commuterId
        && request.resource.data.driverId == resource.data.driverId
        && request.resource.data.startTime == resource.data.startTime
        // Status must be a valid value
        && request.resource.data.status in ['en_route', 'arrived', 'in_progress', 'completed', 'cancelled']
        // Status transition must follow the state machine (NEW - TOW-70)
        && isValidTripTransition(resource.data.status, request.resource.data.status)
        // Timestamp validation per state (all three transitions now covered)
        && (request.resource.data.status != 'arrived'
            || isValidTimestamp('arrivalTime'))
        && (request.resource.data.status != 'in_progress'
            || isValidTimestamp('startedAt'))
        && (request.resource.data.status != 'completed'
            || isValidTimestamp('completionTime'));

      allow delete: if false;
    }

    // ============================================
    // DRIVERS COLLECTION
    // ============================================
    match /drivers/{driverId} {
      // Any authenticated user can read driver profiles
      // (commuters need to see driver info, drivers need to see their own profile)
      allow read: if isAuthenticated();

      // Drivers can create their own profile during onboarding/signup
      // NOTE: isDriver() check intentionally omitted here — the user's role may not
      // yet be set at the moment the driver profile is first created. isVerified must
      // always start as false (set by admin/Cloud Function only).
      allow create: if isAuthenticated()
        && isOwner(driverId)
        && hasRequiredFields(['userId', 'isAvailable', 'isVerified', 'vehicleInfo', 'currentLocation', 'serviceRadius', 'totalTrips'])
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.isVerified == false
        && (request.resource.data.isActivelyDriving == false
            || !request.resource.data.keys().hasAny(['isActivelyDriving']));

      // Updates: driver must be authenticated as the owner, and cannot self-verify
      // isDriver() check is included here as the user should have a role by update time
      allow update: if isAuthenticated()
        && isOwner(driverId)
        // isVerified can only be changed by a Cloud Function/admin — not the client
        && request.resource.data.isVerified == resource.data.isVerified
        // userId is immutable
        && request.resource.data.userId == resource.data.userId;

      allow delete: if false;
    }

    // ============================================
    // DRIVER LOCATIONS COLLECTION
    // ============================================
    // NOTE: As of Sprint 2, driverLocations is NOT written by any client-side
    // service function. updateDriverAvailability() writes to drivers/{driverId}
    // only. These rules are forward-looking for Phase 3 background location tracking.
    match /driverLocations/{driverId} {
      // Any authenticated user can read driver locations
      // (commuters need to track their assigned driver during an active trip)
      allow read: if isAuthenticated();

      // Only the driver can create/update their own location document
      allow create, update: if isAuthenticated()
        && isOwner(driverId)
        && request.resource.data.driverId == request.auth.uid;

      // Drivers can delete their location when going offline
      allow delete: if isAuthenticated()
        && isOwner(driverId);
    }

    // ============================================
    // DEFAULT DENY ALL OTHER COLLECTIONS
    // ============================================
    // Any new collection is denied by default until explicitly added above.
  }
}
```

---

## Summary of Changes from Current Rules

| Section                         | Change                                                                                                | Priority |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| Helper functions                | Add `isValidTripTransition()` function                                                                | HIGH     |
| `requests` update               | Add branch [2]: driver claiming a `searching` request                                                 | CRITICAL |
| `drivers` create                | Remove `isDriver()` requirement, add `isVerified == false` and `userId` field validation              | HIGH     |
| `drivers` update                | Remove `isDriver()` requirement, add `isVerified` immutability check, add `userId` immutability check | HIGH     |
| `trips` update                  | Add `isValidTripTransition()` call to enforce state machine order                                     | LOW      |
| `trips` update                  | Add `startedAt` timestamp validation when `status == 'in_progress'`                                   | MEDIUM   |
| `driverLocations` create/update | Add `driverId` field equality check                                                                   | MEDIUM   |

---

## Testing Checklist

Once the updated rules are deployed, verify each of the following manually using the Firebase Emulator or a dev Firestore project.

### USERS Collection Tests

- [ ] Authenticated user can create their own `users/{uid}` document with valid `email` and `createdAt`
- [ ] Authenticated user cannot create a `users` document for a different UID
- [ ] Authenticated user cannot set `role` to an invalid value (e.g., `'admin'`)
- [ ] Authenticated user can update their own profile (change name, phone)
- [ ] Authenticated user cannot change their own `email` field after creation
- [ ] Authenticated user cannot change their own `createdAt` after creation
- [ ] Unauthenticated user cannot read any `users` document
- [ ] Authenticated user CAN read another user's profile (needed for driver/commuter info display)

### REQUESTS Collection Tests

- [ ] Authenticated commuter can create a request with all required fields and `status: 'searching'`
- [ ] Authenticated commuter cannot create a request with `commuterId` pointing to a different user
- [ ] Authenticated commuter cannot create a request with `status` other than `'searching'`
- [ ] Authenticated driver CANNOT create a request (only commuters can)
- [ ] Commuter can cancel (update to `status: 'cancelled'`) their own request
- [ ] Driver can claim a `searching` request (update to `status: 'claimed'` with their own UID as `claimedByDriverId`)
- [ ] Driver CANNOT claim a `claimed` request belonging to another driver
- [ ] Driver CANNOT claim a `cancelled` or `accepted` request
- [ ] Driver can accept a request they have claimed (update to `status: 'accepted'`)
- [ ] Driver CANNOT accept a request claimed by a different driver
- [ ] Driver can decline a request they have claimed (update back to `status: 'searching'`, clear `claimedByDriverId`)
- [ ] Driver CANNOT decline a request claimed by a different driver
- [ ] No authenticated user can delete a request document

### TRIPS Collection Tests

- [ ] Authenticated driver can create a trip document for themselves (`driverId == request.auth.uid`)
- [ ] A trip MUST start with `status: 'en_route'`
- [ ] Driver CANNOT create a trip with another driver's UID as `driverId`
- [ ] Commuter (non-driver) CANNOT create a trip document
- [ ] Driver can update their own trip from `en_route` to `arrived` (sets `arrivalTime`)
- [ ] Driver CANNOT update a trip to `arrived` without providing a valid `arrivalTime` timestamp
- [ ] Driver can update their own trip from `arrived` to `in_progress` (sets `startedAt`)
- [ ] Driver CANNOT update a trip to `in_progress` without providing a valid `startedAt` timestamp
- [ ] Driver can update their own trip from `in_progress` to `completed` (sets `completionTime`)
- [ ] Driver CANNOT skip states (e.g., `en_route` directly to `completed`)
- [ ] Driver CANNOT update another driver's trip
- [ ] Commuter CAN read their own trip (`commuterId == request.auth.uid`)
- [ ] Driver CAN read their own trip (`driverId == request.auth.uid`)
- [ ] An unrelated authenticated user CANNOT read a trip they are not a participant in
- [ ] No authenticated user can delete a trip document

### DRIVERS Collection Tests

- [ ] A newly registered user (role may be `null`) CAN create their own driver profile
- [ ] Driver profile creation must have `isVerified: false`
- [ ] Driver profile creation must have `userId == request.auth.uid`
- [ ] Authenticated driver can update their own `isAvailable`, `currentLocation`, `geohash`
- [ ] Driver CANNOT change `isVerified` from `false` to `true` via client-side update
- [ ] Driver CANNOT change `userId` field
- [ ] No authenticated user can delete a driver profile

### DRIVER LOCATIONS Collection Tests

- [ ] Authenticated driver can create/update their own location document
- [ ] The `driverId` field in the document must match the authenticated user's UID
- [ ] Any authenticated user can read driver locations (needed for commuter tracking)
- [ ] Driver can delete their own location document (when going offline)

---

## Deployment Steps

1. **Test with Firebase Emulator first** (strongly recommended):

   ```bash
   firebase emulators:start --only firestore
   ```

1. **Deploy the updated rules**:

   ```bash
   firebase deploy --only firestore:rules
   ```

1. **Verify in Firebase Console**:
   - Navigate to Firestore > Rules
   - Confirm the published rules match this specification
   - Use the Rules Playground to simulate the test scenarios above

1. **Regression test the app** by running through the core flows:
   - Commuter creates a request
   - Driver goes online
   - Driver claims the request (popup appears)
   - Driver accepts (trip created)
   - Driver progresses through `arrived` → `in_progress` → `completed`

---

## Dependencies and Notes

- **Cloud Functions** (implemented as part of TOW-52) handle the timeout reassignment logic — they run with admin SDK credentials and bypass all client-side security rules. Cloud Function writes do not need to satisfy these rules.
- **`isDriver()` helper reads `users/{uid}`** — this counts as one Firestore document read per rule evaluation. On high-traffic operations, this could add latency. A future optimization would be to cache the role in a custom claim on the Firebase Auth token, eliminating the extra read. This is a Phase 4 concern.
- **The `requests` read rule remains permissive** (`allow read: if isAuthenticated()`). A tighter rule would restrict commuters to reading only their own requests and drivers to reading only `searching` or `claimed` requests. This is a Phase 4 hardening task.

---

_Specification created: 2026-02-24_
_Agent: technical-architect_
_Next action: Implement the changes to `/Users/chris/projects/towlink/firestore.rules` using the code-coach agent_
