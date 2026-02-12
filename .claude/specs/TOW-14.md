# Technical Specification: TOW-14

## Story Reference

**Story**: TOW-14 - US-2.2: Create Towing Request (FIX LOCATION BUG)
**Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-14
**Sprint**: TOW Sprint 2 (ends 2026-02-24)
**Priority**: CRITICAL BUG FIX

### Problem Statement

The request creation flow is working BUT the coordinates are hardcoded to `(0,0)` in `services/firebase/firestore.ts`. The commuter screen already has GPS location tracking working (from TOW-39), but this real data is not being passed to the `createRequest()` function.

**Current Issue:**

```typescript
// services/firebase/firestore.ts lines 11-12
location: { latitude: 0, longitude: 0 },  // ❌ HARDCODED
dropoffLocation: { latitude: 0, longitude: 0 },  // ❌ HARDCODED
```

---

## Architecture Overview

This is a **data flow fix** that connects existing UI state to the backend service layer:

```
┌─────────────────────────────────────┐
│  Commuter Screen Component          │
│  app/(commuter)/index.tsx            │
│                                      │
│  State: userLocation (GPS coords)   │ ✅ Already working
│  State: dropoffLocation (TBD)       │ ⚠️  Not yet implemented
└──────────────┬──────────────────────┘
               │
               │ Pass real coords as params
               ↓
┌──────────────────────────────────────┐
│  Service Layer                       │
│  services/firebase/firestore.ts      │
│                                       │
│  createRequest(                      │
│    commuterId,                       │
│    pickupLocation: Location,         │ ← Add this param
│    dropoffLocation: Location,        │ ← Add this param
│    pickupAddress,                    │
│    dropoffAddress                    │
│  )                                   │
└──────────────┬───────────────────────┘
               │
               │ Write to Firestore
               ↓
┌──────────────────────────────────────┐
│  Firestore Collection: requests/     │
│                                       │
│  {                                   │
│    location: { lat, lng },           │ ✅ Real coordinates
│    dropoffLocation: { lat, lng },    │ ✅ Real coordinates
│    address: "123 Main St",           │
│    ...                               │
│  }                                   │
└──────────────────────────────────────┘
```

---

## Technical Requirements

### 1. Update Service Layer

**File**: `services/firebase/firestore.ts`

**Current Function Signature** (lines 4-8):

```typescript
export async function createRequest(
	commuterId: string,
	pickupAddress: string,
	dropoffAddress: string,
);
```

**New Function Signature**:

```typescript
export async function createRequest(
	commuterId: string,
	pickupLocation: { latitude: number; longitude: number },
	dropoffLocation: { latitude: number; longitude: number },
	pickupAddress: string,
	dropoffAddress: string,
): Promise<string>;
```

**Changes Required**:

1. Add `pickupLocation` parameter (before addresses)
2. Add `dropoffLocation` parameter (before addresses)
3. Replace hardcoded coordinates on lines 11-12 with the parameters
4. Add validation to ensure coordinates are not `(0,0)` or invalid

**Updated Implementation**:

```typescript
export async function createRequest(
	commuterId: string,
	pickupLocation: { latitude: number; longitude: number },
	dropoffLocation: { latitude: number; longitude: number },
	pickupAddress: string,
	dropoffAddress: string,
): Promise<string> {
	// Validate coordinates are not zero
	if (pickupLocation.latitude === 0 && pickupLocation.longitude === 0) {
		throw new Error('Invalid pickup location: coordinates cannot be (0,0)');
	}

	if (dropoffLocation.latitude === 0 && dropoffLocation.longitude === 0) {
		throw new Error('Invalid dropoff location: coordinates cannot be (0,0)');
	}

	// Validate coordinates are in valid range
	if (
		Math.abs(pickupLocation.latitude) > 90 ||
		Math.abs(pickupLocation.longitude) > 180
	) {
		throw new Error('Invalid pickup coordinates: out of range');
	}

	if (
		Math.abs(dropoffLocation.latitude) > 90 ||
		Math.abs(dropoffLocation.longitude) > 180
	) {
		throw new Error('Invalid dropoff coordinates: out of range');
	}

	const requestData = {
		commuterId: commuterId,
		location: pickupLocation, // ✅ Use real coordinates
		dropoffLocation: dropoffLocation, // ✅ Use real coordinates
		address: pickupAddress,
		serviceType: 'tow',
		status: 'searching',
		matchedDriverId: null,
		createdAt: Timestamp.now(),
		expiresAt: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
	};

	const docRef = await addDoc(collection(db, 'requests'), requestData);

	return docRef.id;
}
```

---

### 2. Update Commuter Screen Component

**File**: `app/(commuter)/index.tsx`

**Current State** (lines 10-16):

```typescript
const [userLocation, setUserLocation] = useState<{
	latitude: number;
	longitude: number;
} | null>(null);
const [mapRef, setMapRef] = useState<MapView | null>(null);
const [selectedService, setSelectedService] = useState('towing');
const [isCreatingRequest, setIsCreatingRequest] = useState(false);
```

**Add New State for Dropoff Location**:

```typescript
const [dropoffLocation, setDropoffLocation] = useState<{
	latitude: number;
	longitude: number;
} | null>(null);
```

**Current `handleRequestAssistance()` Function** (lines 57-84):

```typescript
async function handleRequestAssistance() {
	if (!userLocation) {
		Alert.alert('Location required, please wait for your location to load');
		return;
	}

	if (!user) {
		Alert.alert('Error', 'You must be signed in to create a request');
		return;
	}

	setIsCreatingRequest(true);
	try {
		const requestId = await createRequest(
			user.uid,
			'My current location', // ❌ Placeholder
			'Destination address', // ❌ Placeholder
		);
		Alert.alert('Request sent, searching for nearby drivers...');
		console.log('Request created:', requestId);
	} catch (error) {
		Alert.alert('Error, failed to create a request. Please try again');
		console.error(error);
	} finally {
		setIsCreatingRequest(false);
	}
}
```

**Updated `handleRequestAssistance()` Function**:

```typescript
async function handleRequestAssistance() {
	// Validate pickup location exists
	if (!userLocation) {
		Alert.alert('Location Required', 'Please wait for your location to load');
		return;
	}

	// Validate user is authenticated
	if (!user) {
		Alert.alert('Error', 'You must be signed in to create a request');
		return;
	}

	// For MVP: Use user's current location as dropoff if not set
	// TODO: In future stories, add destination picker UI
	const dropoff = dropoffLocation || userLocation;

	setIsCreatingRequest(true);
	try {
		// Get human-readable addresses using reverse geocoding
		// For MVP, we'll use placeholder addresses
		// TODO: TOW-XX will add proper reverse geocoding
		const pickupAddress = 'Current Location';
		const dropoffAddress = dropoffLocation
			? 'Selected Destination'
			: 'Current Location';

		const requestId = await createRequest(
			user.uid,
			userLocation, // ✅ Real pickup coordinates
			dropoff, // ✅ Real dropoff coordinates
			pickupAddress,
			dropoffAddress,
		);

		Alert.alert('Request Sent', 'Searching for nearby drivers...');
		console.log('Request created with ID:', requestId);
		console.log('Pickup location:', userLocation);
		console.log('Dropoff location:', dropoff);
	} catch (error) {
		console.error('Error creating request:', error);

		// Show specific error message if available
		const errorMessage =
			error instanceof Error
				? error.message
				: 'Failed to create request. Please try again.';

		Alert.alert('Error', errorMessage);
	} finally {
		setIsCreatingRequest(false);
	}
}
```

---

### 3. Type Safety

**File**: `types/models.ts`

**Current Location Interface** (lines 38-41):

```typescript
export interface Location {
	latitude: number;
	longitude: number;
}
```

This interface is already correct and matches our needs. No changes required.

---

## Implementation Steps

### Step 1: Update the Service Function

**File**: `services/firebase/firestore.ts`

**Action**: Modify the `createRequest()` function signature and implementation

**Changes**:

1. Add two new parameters: `pickupLocation` and `dropoffLocation` (both type `{ latitude: number; longitude: number }`)
2. Add validation logic to ensure coordinates are valid
3. Replace hardcoded `{ latitude: 0, longitude: 0 }` with the parameter values
4. Maintain existing return type `Promise<string>`

**Code Location**: Lines 4-27

---

### Step 2: Update the Component Function Call

**File**: `app/(commuter)/index.tsx`

**Action**: Update the `handleRequestAssistance()` function to pass real coordinates

**Changes**:

1. Check that `userLocation` is not null (already done)
2. Use `userLocation` as pickup coordinates
3. For MVP, use `userLocation` as dropoff coordinates (temporary solution)
4. Update the `createRequest()` call to pass location objects
5. Add console.log statements to verify coordinates are real
6. Improve error handling to show specific validation errors

**Code Location**: Lines 57-84

---

### Step 3: Add Validation Pre-Flight Checks

**File**: `app/(commuter)/index.tsx`

**Action**: Add additional validation in the UI layer

**Changes**:

1. Check if userLocation is `(0, 0)` and show warning
2. Optionally add a visual indicator showing GPS accuracy
3. Consider disabling button if location is not yet loaded

**Code Hint**:

```typescript
// Additional check before calling createRequest
if (userLocation.latitude === 0 && userLocation.longitude === 0) {
	Alert.alert(
		'Invalid Location',
		'Waiting for GPS signal. Please ensure location services are enabled.',
	);
	return;
}
```

---

### Step 4: Test and Verify

**Action**: Manual testing on physical device or simulator

**Test Cases**:

1. Grant location permission → Verify GPS coordinates load on map
2. Press "Request Roadside Assistance" → Verify request is created
3. Check Firestore console → Verify `location` and `dropoffLocation` have real coordinates (not 0,0)
4. Check console logs → Verify coordinates are logged correctly
5. Test with location permission denied → Verify error handling
6. Test with GPS signal weak/unavailable → Verify graceful degradation

**Expected Results**:

- Request document in Firestore has real latitude/longitude values
- Console logs show non-zero coordinates
- User sees confirmation message
- No errors in console

---

### Step 5: Future Enhancement Hook

**Action**: Add TODO comments for future destination picker

**Add Comments**:

```typescript
// TODO: TOW-XX - Add destination picker UI
// Currently using current location as dropoff for MVP
// Future: Add map interaction to select dropoff location
// Future: Add saved addresses (home, work, etc.)
// Future: Add Google Places autocomplete for address search
```

**Location**: Near `handleRequestAssistance()` function

---

## Edge Cases & Error Handling

### Edge Case 1: Location Permission Denied

**Scenario**: User denies location permission or revokes it

**Current Handling**:

- `getUserLocation()` shows alert: "Permission denied, location access needed"
- `userLocation` remains `null`
- Button press shows: "Location required, please wait for your location to load"

**Action**: No changes needed, already handled correctly

---

### Edge Case 2: GPS Signal Not Available

**Scenario**: User is indoors, GPS takes time to lock, or device has poor GPS

**Current Handling**:

- `userLocation` may be `null` or stale
- User can still attempt to create request

**New Handling**:

- Add validation to check if coordinates are valid
- Service layer rejects `(0, 0)` coordinates
- Show specific error message to user

**Implementation**: Already included in Step 1 validation

---

### Edge Case 3: Location Updates During Request Creation

**Scenario**: User's location updates while request is being created

**Current Handling**: Uses location at time of button press

**Action**: No changes needed - this is correct behavior

---

### Edge Case 4: Dropoff Location Not Set (MVP)

**Scenario**: No destination picker UI exists yet

**Handling**:

- Use current location as temporary dropoff
- Add TODO comments for future enhancement
- This is acceptable for MVP testing

**Implementation**: Already included in Step 2

---

### Edge Case 5: Invalid Coordinates from expo-location

**Scenario**: expo-location returns invalid coordinates (rare but possible)

**Handling**:

- Service layer validates coordinates are in valid range
- Latitude: -90 to 90
- Longitude: -180 to 180
- Reject if exactly `(0, 0)` (likely means no GPS lock)

**Implementation**: Already included in Step 1 validation

---

## Testing Strategy

### Manual Testing Checklist

**Pre-requisites**:

- Device with GPS capability (physical device preferred)
- Location services enabled
- TowLink app installed
- User logged in as commuter

**Test Case 1: Happy Path**

1. Open commuter screen
2. Wait for GPS location to load (blue marker appears)
3. Press "Request Roadside Assistance"
4. Verify: Alert shows "Searching for nearby drivers..."
5. Open Firebase Console → requests collection
6. Verify: Document has real latitude/longitude (not 0,0)
7. Check console logs for coordinate values

**Expected Result**: ✅ Request created with real GPS coordinates

---

**Test Case 2: No Location Permission**

1. Revoke location permission in device settings
2. Open commuter screen
3. Alert should show: "Permission denied, location access needed"
4. No map marker appears
5. Press "Request Roadside Assistance"
6. Alert should show: "Location required, please wait for your location to load"

**Expected Result**: ✅ Graceful error, no request created

---

**Test Case 3: Location Loads Slowly**

1. Open commuter screen immediately after app launch
2. Press button before GPS location loads
3. Verify: Alert shows location required message
4. Wait for location to load
5. Press button again
6. Verify: Request created successfully

**Expected Result**: ✅ Button blocked until location available

---

**Test Case 4: Multiple Requests**

1. Create first request → succeeds
2. Immediately create second request → succeeds
3. Verify both documents in Firestore have real coordinates
4. Verify each has unique coordinates (if device moved)

**Expected Result**: ✅ Multiple requests work correctly

---

**Test Case 5: Simulator Testing (Limited)**

1. Use iOS Simulator or Android Emulator
2. Set custom location (e.g., San Francisco: 37.7749, -122.4194)
3. Create request
4. Verify: Request has simulator's location coordinates

**Expected Result**: ✅ Simulator location used correctly

---

### Verification Commands

**Check Firestore Data**:

```bash
# Open Firebase Console
open https://console.firebase.google.com/u/2/project/towlink-71a59/firestore/databases/-default-/data/~2Frequests

# Look for fields:
# - location.latitude (should NOT be 0)
# - location.longitude (should NOT be 0)
# - dropoffLocation.latitude (should NOT be 0)
# - dropoffLocation.longitude (should NOT be 0)
```

**Check Console Logs**:

```bash
# When running in Expo Go:
npx expo start

# Look for logs like:
# "Request created with ID: abc123"
# "Pickup location: { latitude: 34.0522, longitude: -118.2437 }"
# "Dropoff location: { latitude: 34.0522, longitude: -118.2437 }"
```

---

## Dependencies

### Completed Dependencies

- ✅ TOW-39: Commuter Request Screen with GPS tracking
- ✅ Firebase Firestore integration
- ✅ expo-location permission handling
- ✅ TypeScript Location interface

### Future Dependencies (Not Blocking)

- ⏳ TOW-XX: Destination picker UI (future enhancement)
- ⏳ TOW-XX: Reverse geocoding for address strings (future enhancement)
- ⏳ TOW-XX: Google Places autocomplete (future enhancement)

---

## Validation Checklist

Before marking this story as complete, verify:

- [ ] `createRequest()` function accepts `pickupLocation` and `dropoffLocation` parameters
- [ ] Function validates coordinates are not `(0,0)`
- [ ] Function validates coordinates are in valid range
- [ ] Commuter screen passes real `userLocation` to `createRequest()`
- [ ] Request document in Firestore has real coordinates
- [ ] Console logs show real coordinates (not 0,0)
- [ ] Error handling works for invalid coordinates
- [ ] Error handling works for missing location
- [ ] Button is disabled while creating request
- [ ] Success alert shown after request created
- [ ] TODO comments added for future destination picker

---

## Code Review Focus Areas

**For the code-coach agent to emphasize**:

1. **Understanding the Data Flow**
   - Where does location data come from? (expo-location)
   - How does it flow through state? (useState)
   - How is it passed to service? (function parameters)
   - Where is it stored? (Firestore)

2. **Validation Logic**
   - Why do we check for `(0,0)`?
   - Why do we check coordinate ranges?
   - Where should validation happen? (both UI and service layer)

3. **Error Handling**
   - What happens if GPS fails?
   - What happens if validation fails?
   - How do we show errors to users?

4. **TypeScript Benefits**
   - How do types prevent bugs?
   - What would happen without type checking?
   - How does TypeScript help with refactoring?

---

## Success Metrics

**Functional Success**:

- Request documents in Firestore have real, valid GPS coordinates
- No more hardcoded `(0,0)` values
- Error handling prevents invalid requests

**Learning Success**:

- Student understands how to pass data from UI to service layer
- Student understands validation patterns (UI + service layer)
- Student understands GPS location state management
- Student can verify data in Firebase Console

**Code Quality**:

- Function signatures are clear and well-typed
- Validation logic is comprehensive
- Error messages are user-friendly
- Console logs help with debugging
- TODO comments guide future work

---

## Next Steps After Completion

After this story is complete and verified:

1. **Invoke quality-reviewer agent** to:
   - Verify all acceptance criteria met
   - Check code quality and patterns
   - Validate Firebase data structure
   - Create review document

2. **Future Enhancement Stories**:
   - TOW-XX: Add destination picker UI with map interaction
   - TOW-XX: Implement reverse geocoding for address strings
   - TOW-XX: Add Google Places autocomplete
   - TOW-XX: Add saved addresses (home, work, etc.)

3. **Related Work**:
   - Driver screen will query requests and see real locations on map
   - Smart matching algorithm will use real coordinates for distance calculations
   - Route navigation will use these coordinates for turn-by-turn directions

---

## Reference Links

- **Jira Story**: https://chriskelamyan115.atlassian.net/browse/TOW-14
- **Firebase Console**: https://console.firebase.google.com/u/2/project/towlink-71a59/firestore
- **expo-location Docs**: https://docs.expo.dev/versions/latest/sdk/location/
- **Firestore Docs**: https://firebase.google.com/docs/firestore

---

_Specification created: 2026-02-12_
_Agent: technical-architect_
_Next agent: code-coach (to create lesson plan and guide implementation)_
