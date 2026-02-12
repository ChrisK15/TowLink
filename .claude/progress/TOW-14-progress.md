# Lesson Plan & Progress: TOW-14

## Story: Fix Location Bug in Request Creation
**Student**: Chris
**Coach**: Claude Code
**Date Started**: 2026-02-12
**Story Link**: https://chriskelamyan115.atlassian.net/browse/TOW-14

---

## The Problem We're Solving

Right now, when a commuter taps "Request Roadside Assistance", the request IS being created in Firestore, but there's a critical bug:

**Current code in `services/firebase/firestore.ts` (lines 11-12):**
```typescript
location: { latitude: 0, longitude: 0 },  // ❌ HARDCODED
dropoffLocation: { latitude: 0, longitude: 0 },  // ❌ HARDCODED
```

The problem: We're saving `(0,0)` coordinates (which is in the middle of the ocean off the coast of Africa!) instead of the user's real GPS location.

The good news: Your commuter screen ALREADY has GPS location tracking working! The `userLocation` state has the real coordinates. We just need to pass that data to the `createRequest()` function.

---

## Learning Objectives

By the end of this lesson, you'll understand:

1. **Data Flow**: How location data flows from GPS → UI State → Service Layer → Database
2. **Function Parameters**: How to update function signatures to accept new data
3. **Validation**: Why and where to validate data (UI layer + service layer)
4. **Error Handling**: How to handle GPS failures and invalid coordinates
5. **Testing**: How to verify your changes in Firebase Console

---

## Pre-Implementation Discussion

Before writing any code, let's make sure you understand the architecture:

### Question 1: Where does location data come from?
Look at `app/(commuter)/index.tsx` lines 23-41. The `getUserLocation()` function:
- Uses `expo-location` to request permission
- Gets current GPS coordinates
- Stores them in `userLocation` state

**Think about**: What is the type of `userLocation`? (Look at line 10-13)

### Question 2: Where does the data need to go?
Look at `services/firebase/firestore.ts` lines 4-27. The `createRequest()` function:
- Takes parameters from the caller
- Creates a `requestData` object
- Saves it to Firestore using `addDoc()`

**Think about**: Currently, what parameters does `createRequest()` accept? What's missing?

### Question 3: Why validate in two places?
We'll add validation in BOTH the UI component AND the service function.

**Think about**:
- What would happen if GPS returns `(0, 0)` and we don't check?
- What would happen if another part of the app calls `createRequest()` with bad data?
- Why is "defense in depth" important?

---

## Implementation Steps

### Step 1: Update the Service Function Signature
**Goal**: Make the `createRequest()` function accept location coordinates as parameters

**File**: `services/firebase/firestore.ts`

**Current signature (line 4-8)**:
```typescript
export async function createRequest(
	commuterId: string,
	pickupAddress: string,
	dropoffAddress: string
)
```

**Your task**: Update this signature to add TWO new parameters:
1. `pickupLocation` - type: `{ latitude: number; longitude: number }`
2. `dropoffLocation` - type: `{ latitude: number; longitude: number }`

**Guidance**:
- Add these BEFORE the address parameters (so the order is: id, locations, addresses)
- This matches the data flow: we get coordinates from GPS, then optionally geocode to addresses
- Keep the return type as `Promise<string>` (the request ID)

**Hint**: Look at the `Location` interface in `types/models.ts` line 38-41 for the correct type structure.

<details>
<summary>Click here if you need help with the signature</summary>

```typescript
export async function createRequest(
	commuterId: string,
	pickupLocation: { latitude: number; longitude: number },
	dropoffLocation: { latitude: number; longitude: number },
	pickupAddress: string,
	dropoffAddress: string
): Promise<string> {
```
</details>

**Status**: [ ] Complete

---

### Step 2: Add Validation Logic
**Goal**: Ensure coordinates are valid before saving to Firestore

**File**: `services/firebase/firestore.ts`

After updating the function signature, add validation logic at the START of the function (before creating `requestData`).

**Your task**: Add validation to check:
1. Pickup coordinates are not `(0, 0)`
2. Dropoff coordinates are not `(0, 0)`
3. Coordinates are in valid ranges:
   - Latitude: between -90 and 90
   - Longitude: between -180 and 180

**Guidance**:
- Use `if` statements to check each condition
- Use `throw new Error('message')` to reject invalid data
- Make error messages descriptive so developers know what went wrong

**Why validate for `(0, 0)`?**
- This is what we were hardcoding before (the bug we're fixing!)
- If GPS hasn't locked yet, it might return 0s
- `(0, 0)` is in the middle of the ocean - not a real user location

**Why validate coordinate ranges?**
- Latitude must be -90 to 90 (North/South poles)
- Longitude must be -180 to 180 (wraps around the globe)
- Values outside this range are mathematically impossible

<details>
<summary>Click here if you need help with validation</summary>

```typescript
// Validate pickup location
if (pickupLocation.latitude === 0 && pickupLocation.longitude === 0) {
	throw new Error('Invalid pickup location: coordinates cannot be (0,0)');
}

if (Math.abs(pickupLocation.latitude) > 90 || Math.abs(pickupLocation.longitude) > 180) {
	throw new Error('Invalid pickup coordinates: out of range');
}

// Validate dropoff location
if (dropoffLocation.latitude === 0 && dropoffLocation.longitude === 0) {
	throw new Error('Invalid dropoff location: coordinates cannot be (0,0)');
}

if (Math.abs(dropoffLocation.latitude) > 90 || Math.abs(dropoffLocation.longitude) > 180) {
	throw new Error('Invalid dropoff coordinates: out of range');
}
```

**Tip**: `Math.abs()` gets the absolute value, so we can check both negative and positive bounds with one condition.
</details>

**Status**: [ ] Complete

---

### Step 3: Use the Parameters Instead of Hardcoded Values
**Goal**: Replace the hardcoded `(0, 0)` with real data from parameters

**File**: `services/firebase/firestore.ts`

Look at lines 11-12 in the `requestData` object:
```typescript
location: { latitude: 0, longitude: 0 },  // ❌ HARDCODED
dropoffLocation: { latitude: 0, longitude: 0 },  // ❌ HARDCODED
```

**Your task**: Replace the hardcoded objects with the parameter values.

**Guidance**:
- Line 11: Change `{ latitude: 0, longitude: 0 }` to use the `pickupLocation` parameter
- Line 12: Change `{ latitude: 0, longitude: 0 }` to use the `dropoffLocation` parameter
- The parameters are already in the right shape, so you can use them directly

<details>
<summary>Click here if you need help</summary>

```typescript
location: pickupLocation,  // ✅ Real pickup coordinates
dropoffLocation: dropoffLocation,  // ✅ Real dropoff coordinates
```

You could even simplify with ES6 shorthand if the variable names matched the object keys, but in this case they're different (location vs pickupLocation), so explicit is clearer.
</details>

**Status**: [ ] Complete

---

### Step 4: Update the Component to Pass Real Data
**Goal**: Update the commuter screen to pass real GPS coordinates when calling `createRequest()`

**File**: `app/(commuter)/index.tsx`

Look at the `handleRequestAssistance()` function, lines 57-84. Currently it calls:
```typescript
const requestId = await createRequest(
	user.uid,
	'My current location',
	'Destination address',
);
```

This doesn't match the new function signature! TypeScript should show you an error now.

**Your task**: Update this function call to pass the location coordinates.

**Guidance**:
1. The function already checks that `userLocation` exists (line 58-61) ✅
2. Use `userLocation` for the pickup location
3. For MVP, we'll use `userLocation` for dropoff too (since we don't have a destination picker UI yet)
4. Update the address strings to be more descriptive placeholders

**Think about**: Why is it okay to use the same location for pickup and dropoff for now?
- This is temporary for testing
- Real dropoff location will come from a destination picker UI (future story)
- For now, this lets us test that coordinates are flowing correctly

<details>
<summary>Click here if you need help</summary>

```typescript
async function handleRequestAssistance() {
	// Validate pickup location exists
	if (!userLocation) {
		Alert.alert(
			'Location Required',
			'Please wait for your location to load'
		);
		return;
	}

	// Validate user is authenticated
	if (!user) {
		Alert.alert('Error', 'You must be signed in to create a request');
		return;
	}

	// For MVP: Use current location as dropoff (temporary)
	// TODO: Add destination picker UI in future story
	const pickupAddress = 'Current Location';
	const dropoffAddress = 'Current Location (temp)';

	setIsCreatingRequest(true);
	try {
		const requestId = await createRequest(
			user.uid,
			userLocation,  // ✅ Real pickup coordinates
			userLocation,  // ✅ Using same for dropoff (temporary)
			pickupAddress,
			dropoffAddress
		);

		Alert.alert(
			'Request Sent',
			'Searching for nearby drivers...'
		);

		// Log for debugging
		console.log('Request created with ID:', requestId);
		console.log('Pickup location:', userLocation);
		console.log('Dropoff location:', userLocation);

	} catch (error) {
		console.error('Error creating request:', error);

		// Show specific error message if available
		const errorMessage = error instanceof Error
			? error.message
			: 'Failed to create request. Please try again.';

		Alert.alert('Error', errorMessage);

	} finally {
		setIsCreatingRequest(false);
	}
}
```
</details>

**Status**: [ ] Complete

---

### Step 5: Add Extra UI Validation (Optional but Recommended)
**Goal**: Catch invalid GPS data before calling the service function

**File**: `app/(commuter)/index.tsx`

Add an additional check in `handleRequestAssistance()` after the null check but before creating the request.

**Your task**: Add validation to ensure coordinates are not `(0, 0)`

**Guidance**:
- This is a "belt and suspenders" approach
- The service layer will catch this too, but showing a GPS-specific message is more helpful to users
- If GPS hasn't locked yet, coordinates might be 0

<details>
<summary>Click here if you need help</summary>

```typescript
// After the userLocation null check, add:
if (userLocation.latitude === 0 && userLocation.longitude === 0) {
	Alert.alert(
		'GPS Not Ready',
		'Waiting for GPS signal. Please ensure location services are enabled and you have a clear view of the sky.'
	);
	return;
}
```
</details>

**Status**: [ ] Complete

---

### Step 6: Add TODO Comments for Future Work
**Goal**: Document what still needs to be built

**File**: `app/(commuter)/index.tsx`

Add comments near where you're using `userLocation` for both pickup and dropoff to remind yourself (and other developers) that this is temporary.

**Your task**: Add a comment block explaining the temporary solution

**Guidance**:
- Put it right before the line where you assign dropoff location
- Mention what needs to be built (destination picker UI)
- Reference that this will be a future Jira story

<details>
<summary>Click here if you need help</summary>

```typescript
// TODO: Future story - Add destination picker UI
// Currently using current location as dropoff for MVP testing
// Future enhancements:
// - Map interaction to select destination
// - Google Places autocomplete for address search
// - Saved addresses (home, work, etc.)
const pickupAddress = 'Current Location';
const dropoffAddress = 'Current Location (temp)';
```
</details>

**Status**: [ ] Complete

---

## Testing Your Changes

Now comes the exciting part - verifying that real GPS coordinates are being saved!

### Test 1: Run the App
```bash
npx expo start
```

Press `i` for iOS simulator or `a` for Android emulator

**Status**: [ ] Complete

---

### Test 2: Grant Location Permission

When the app loads the commuter screen:
1. You should see an alert requesting location permission
2. Grant permission
3. Wait for the map to load
4. You should see a cyan marker at your location

**Check**: Does the marker appear at a real location (not `(0, 0)`)?

**Status**: [ ] Complete

---

### Test 3: Create a Test Request

1. Tap the "Request Roadside Assistance" button
2. You should see "Creating Request..." briefly
3. Then see an alert: "Searching for nearby drivers..."
4. Check the console logs

**Expected console output**:
```
Request created with ID: abc123xyz
Pickup location: { latitude: 37.7749, longitude: -122.4194 }
Dropoff location: { latitude: 37.7749, longitude: -122.4194 }
```

**Check**: Are the latitude and longitude values NOT zero?

**Status**: [ ] Complete

---

### Test 4: Verify in Firebase Console

This is the most important test!

1. Open Firebase Console: https://console.firebase.google.com/u/2/project/towlink-71a59/firestore
2. Navigate to Firestore Database
3. Find the `requests` collection
4. Click on your newly created request document
5. Look at the `location` and `dropoffLocation` fields

**Expected data**:
```
location:
  latitude: 37.7749 (or whatever your actual location is)
  longitude: -122.4194 (or whatever your actual location is)

dropoffLocation:
  latitude: 37.7749
  longitude: -122.4194
```

**Check**:
- [ ] `location.latitude` is NOT 0
- [ ] `location.longitude` is NOT 0
- [ ] `dropoffLocation.latitude` is NOT 0
- [ ] `dropoffLocation.longitude` is NOT 0
- [ ] Coordinates match what you saw in console logs

**Status**: [ ] Complete

---

### Test 5: Error Handling - No Location

Test what happens if GPS isn't ready:

1. Close and reopen the app
2. Immediately tap "Request Roadside Assistance" (before GPS loads)
3. You should see: "Location Required - Please wait for your location to load"

**Check**: Does the error message appear?

**Status**: [ ] Complete

---

### Test 6: Multiple Requests

Create 2-3 requests in a row:

1. Tap button → Wait for success
2. Tap button again → Wait for success
3. Tap button again → Wait for success

Check Firebase Console - you should see multiple request documents, each with real coordinates.

**Check**: Do all requests have valid coordinates?

**Status**: [ ] Complete

---

## Understanding What You Built

### The Data Flow Journey

Let's trace how location data flows through the system:

```
1. Device GPS
   ↓
2. expo-location (Location.getCurrentPositionAsync)
   ↓
3. React State (userLocation)
   ↓
4. Function Parameter (pickupLocation)
   ↓
5. Firestore Document (location field)
   ↓
6. Firebase Database (persistent storage)
```

**Reflection Question**: At which points in this flow do we validate the data? Why?

---

### Why Two Layers of Validation?

We validate in both the UI component AND the service function:

**UI Layer Validation** (`app/(commuter)/index.tsx`):
- Checks if location is null
- Checks if location is `(0, 0)`
- Shows user-friendly GPS-specific messages
- Prevents unnecessary network calls

**Service Layer Validation** (`services/firebase/firestore.ts`):
- Checks coordinate values
- Validates coordinate ranges
- Shows developer-friendly error messages
- Protects against bugs in other parts of the app

**Principle**: "Don't trust, verify"
- UI might have bugs
- Other code might call the service function
- Validation at the service layer is the "last line of defense"

---

### The Temporary Dropoff Solution

You used `userLocation` for BOTH pickup and dropoff. This is intentional for MVP:

**Why this works for testing**:
- Verifies that coordinate data is flowing correctly
- Allows testing the complete request creation flow
- Doesn't require building a complex destination picker UI yet

**Why this isn't final**:
- Real users need to specify where they want to be towed TO
- Future story will add:
  - Map interaction to tap/select destination
  - Google Places autocomplete for address search
  - Saved addresses (home, work, etc.)

**Learning Point**: Sometimes "good enough for now" is the right choice. Build incrementally, test thoroughly at each step.

---

## Common Issues & Troubleshooting

### Issue 1: TypeScript Error After Changing Function Signature

**Error**: "Expected 5 arguments, but got 3"

**Cause**: You updated `createRequest()` signature but haven't updated all call sites yet

**Fix**: Make sure you updated BOTH:
1. The function definition in `services/firebase/firestore.ts`
2. The function call in `app/(commuter)/index.tsx`

---

### Issue 2: Coordinates Still Show as `(0, 0)` in Firestore

**Possible Causes**:
1. GPS permission not granted
2. GPS hasn't locked yet (try waiting longer)
3. Simulator location not set (iOS Simulator: Debug → Location → Custom Location)
4. You're still passing hardcoded values in the component

**Debug Steps**:
1. Check console logs - what coordinates are being logged?
2. Check if `userLocation` state is actually set (add a console.log)
3. Verify you removed the hardcoded `{ latitude: 0, longitude: 0 }` from firestore.ts
4. Verify you're passing `userLocation` in the component function call

---

### Issue 3: "Invalid coordinates" Error

**Error**: "Invalid pickup location: coordinates cannot be (0,0)"

**Cause**: GPS hasn't locked yet, so coordinates are 0

**Fix**: This is actually GOOD - your validation is working! Wait for GPS to load (marker appears on map), then try again.

---

### Issue 4: Location Permission Dialog Not Appearing

**Fix for iOS Simulator**:
1. Reset Location & Privacy: Device → Erase All Content and Settings
2. Or manually grant permission: Settings → Privacy → Location Services → Expo Go → Always

**Fix for Android Emulator**:
1. Settings → Apps → Expo Go → Permissions → Location → Allow

---

## Reflection Questions

After completing the implementation, think about these questions:

### Question 1: Type Safety
How did TypeScript help you during this refactor? What would have happened without type checking?

### Question 2: Architecture
Why do we have separate layers (UI component vs service function)? What are the benefits?

### Question 3: Error Handling
We handle errors in multiple places. Can you map out where errors could occur and how we handle each case?

### Question 4: Testing
How would you test this on a real physical device? What differences would you expect compared to the simulator?

### Question 5: Future Enhancement
When you add a destination picker UI in a future story, what parts of this code will need to change? What parts can stay the same?

---

## Completion Checklist

Before marking this story as complete, verify:

### Code Changes
- [ ] `createRequest()` function accepts `pickupLocation` parameter
- [ ] `createRequest()` function accepts `dropoffLocation` parameter
- [ ] Function validates coordinates are not `(0,0)`
- [ ] Function validates coordinates are in valid range
- [ ] Hardcoded `{ latitude: 0, longitude: 0 }` removed from firestore.ts
- [ ] Component passes real `userLocation` to `createRequest()`
- [ ] Component has additional GPS-ready validation
- [ ] Error messages are clear and helpful
- [ ] Console logs added for debugging
- [ ] TODO comments added for future work

### Testing
- [ ] App runs without TypeScript errors
- [ ] Location permission can be granted
- [ ] Map shows marker at real location
- [ ] Request button creates request successfully
- [ ] Console logs show real coordinates (not 0,0)
- [ ] Firebase Console shows real coordinates in request document
- [ ] Error handling works when GPS not ready
- [ ] Multiple requests can be created
- [ ] Button is disabled while creating request

### Documentation
- [ ] Code changes are clear and well-commented
- [ ] Progress file updated with completion status
- [ ] You understand the data flow
- [ ] You understand the validation strategy

---

## Next Steps

After completing and verifying this story:

1. **Commit Your Changes**
   ```bash
   git add services/firebase/firestore.ts app/(commuter)/index.tsx
   git commit -m "Fix location bug: Use real GPS coordinates in request creation

   - Update createRequest() to accept pickup and dropoff locations
   - Add validation for coordinate values
   - Pass real GPS coordinates from commuter screen
   - Add error handling for invalid coordinates
   - Verify real coordinates saved to Firestore

   Fixes TOW-14

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
   ```

2. **Invoke quality-reviewer agent** for code review:
   - The reviewer will verify all acceptance criteria are met
   - Check code quality and patterns
   - Validate Firebase data structure
   - Create review document at `.claude/reviews/TOW-14-review.md`

3. **Mark story as complete** in Jira:
   - Update status to "Done"
   - Add comment with what was accomplished
   - Link to commit

4. **Celebrate!** You just fixed a critical bug and learned about:
   - Data flow architecture
   - Multi-layer validation
   - GPS location handling
   - Firebase data verification
   - Incremental development

---

## Additional Resources

### Expo Location Docs
https://docs.expo.dev/versions/latest/sdk/location/

**Key Topics to Explore**:
- `getCurrentPositionAsync()` options (accuracy, timeout)
- `watchPositionAsync()` for continuous updates
- Geocoding (coordinates → address)
- Reverse geocoding (address → coordinates)

### Firebase Firestore Docs
https://firebase.google.com/docs/firestore

**Key Topics to Explore**:
- Data types and structure
- Geoqueries (for finding nearby drivers)
- Security rules for location data
- Indexing for location-based queries

### React Native Maps
https://github.com/react-native-maps/react-native-maps

**Key Topics to Explore**:
- Adding markers
- Drawing routes
- Customizing map styles
- Handling map gestures (for destination picker)

---

## Notes & Deviations

_Use this section to document any issues you encountered, decisions you made, or deviations from the spec._

Example:
- "Had to restart simulator to get location permission dialog to appear"
- "Added extra validation for negative coordinates"
- "Changed error message wording to be more user-friendly"

---

**Progress Last Updated**: 2026-02-12
**Current Status**: Ready to begin Step 1
**Agent**: code-coach
