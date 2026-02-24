# Technical Specification: TOW-68

## Story Reference

**Title**: Active Trip Screen with Expandable Modal
**Epic**: TOW-3 - Driver Job Management
**Points**: 8 | **Sprint**: TOW Sprint 2 (Feb 12-24, 2026)

**User Story**: As a driver, I want to navigate to an active trip screen with expandable trip details so that I can see the map and manage trip information simultaneously.

**Key Acceptance Criteria**:
- Accepting a request shows the ActiveTripSheet on the existing driver home screen map
- The RequestPopup modal closes and the ActiveTripSheet appears — no navigation occurs
- Full-screen map (already present) with pickup/dropoff markers added
- Bottom sheet modal starting at ~20% height (test between 15%-25% to find best fit), toggling to 90% with spring animation
- Collapsed view: drag handle, status, customer name, brief location
- Expanded view: distance, ETA, call/SMS buttons, addresses, fare - all scrollable
- Real-time Firestore listener on the active trip document

---

## Architecture Overview

**⚠️ Architecture Pivot**: Originally specced as a separate screen, but revised to a **single-screen approach**. The driver home screen (`index.tsx`) IS the map — always. The overlaid UI changes based on state. This mirrors how Uber Driver works and eliminates map duplication.

**Bottom sheet implementation**: The expandable panel is built using React Native's built-in `Modal` + `Animated` API — the same pattern already proven in `components/RequestPopup.tsx` (TOW-51). `@gorhom/bottom-sheet` was attempted and abandoned during TOW-51 due to compatibility and reliability issues.

**How the two-state sheet works**:
- A `Modal` with `transparent={true}` and `animationType="slide"` sits over the map — this gives the natural slide-up entrance that mirrors the RequestPopup sliding down
- An `Animated.Value` drives the panel height between two snap points:
  - Initial/Collapsed: `SCREEN_HEIGHT * 0.20` (start here, adjust between 0.15–0.25 during testing)
  - Expanded: `SCREEN_HEIGHT * 0.90`
- `Animated.spring` drives smooth transitions between states
- A tappable drag handle (`TouchableOpacity`) toggles between the two states
- The modal is never dismissible — it stays on screen for the entire trip

**State flow** (replaces navigation):
```
Driver Home Screen (index.tsx) — map is always visible
  ├─ activeTripId === null  →  show online/offline UI + RequestPopup (if request pending)
  └─ activeTripId !== null  →  show ActiveTripSheet over the map
```

**What triggers the switch**:
```
handleAcceptRequest() succeeds
  └─ acceptClaimedRequest() returns tripId
       └─ setActiveTripId(tripId)  ← state change, no navigation
            └─ useActiveTrip(activeTripId) starts listening
                 └─ ActiveTripSheet renders over existing map
```

**Data flow**:
```
Firestore trips/{tripId}  ──onSnapshot──▶  useActiveTrip hook  ──▶  index.tsx
Firestore requests/{requestId}  ──getDoc──▶  commuterPhone, commuterName
expo-location  ──▶  driverLocation state  ──▶  MapView region (already in index.tsx)
```

---

## Technical Requirements

### Frontend Components

**Files to create:**
- `components/ActiveTripSheet.tsx` - The bottom sheet component (collapsed + expanded content)
- `hooks/use-active-trip.ts` - Custom hook for real-time trip listener ✅ DONE

**Files to modify:**
- `app/(driver)/index.tsx` - Add `activeTripId` state, integrate `useActiveTrip`, update `handleAcceptRequest` to set state instead of navigating, add markers and `ActiveTripSheet` conditionally
- `services/firebase/firestore.ts` - Add `listenToTrip` + `getRequestById` ✅ DONE
- `types/models.ts` - No changes needed (Trip type is complete)

**Files NOT needed (pivot eliminated these):**
- ~~`app/(driver)/active-trip.tsx`~~ - No separate screen
- ~~`app/(driver)/_layout.tsx`~~ - No Stack navigator change needed

### State Management

**ActiveTripScreen state:**
```typescript
// Location of driver (already known pattern from driver index screen)
const [driverLocation, setDriverLocation] = useState<Location | null>(null);

// Map ref for programmatic control
const [mapRef, setMapRef] = useState<MapView | null>(null);
```

**useActiveTrip hook state:**
```typescript
const [trip, setTrip] = useState<Trip | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

**ActiveTripSheet state:**
```typescript
const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.20; // test between 0.15–0.25
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.90;

// Animated value controlling panel height
const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

// Track whether sheet is expanded (for toggling)
const [isExpanded, setIsExpanded] = useState(false);
```

### Backend (Firebase)

**Firestore listener needed** (add to `services/firebase/firestore.ts`):
```typescript
// Listen to a specific trip document for real-time updates
export function listenToTrip(
  tripId: string,
  callback: (trip: Trip | null) => void
): () => void
```

The `trips` collection already exists. The `acceptClaimedRequest` function already creates trip documents with:
- `requestId`, `commuterId`, `driverId`
- `status: 'en_route'`
- `pickupLocation`, `dropoffLocation`
- `startTime`, `estimatedPrice`

**Note on commuter contact info**: The `Trip` document does not store `commuterName` or `commuterPhone`. These live on the linked `requests/{requestId}` document. The screen should either:
- Option A: Do a one-time `getDoc` on the request document when the screen loads (simpler)
- Option B: Denormalize the data into the trip document at creation time (better long-term)

**Recommended for this story**: Use Option A (one-time fetch from the request document). This avoids changing the trip creation logic.

**Firestore Structure** (existing, no changes):
```javascript
trips/{tripId} {
  requestId: string,
  commuterId: string,
  driverId: string,
  status: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled',
  pickupLocation: { latitude: number, longitude: number },
  dropoffLocation: { latitude: number, longitude: number },
  startTime: Timestamp,
  estimatedPrice: number,
  // ...other fields
}
```

**Security Rules**: No changes needed for development phase (permissive rules active).

---

## Third-Party Integrations

### No New Packages Needed

All functionality is implemented with APIs already available in React Native:

| Need | Solution | Source |
|------|----------|--------|
| Animated panel | `Animated` + `Modal` | `react-native` (built-in) |
| Snap-point spring | `Animated.spring` | `react-native` (built-in) |
| Screen dimensions | `Dimensions` | `react-native` (built-in) |
| Tap gesture on handle | `TouchableOpacity` | `react-native` (built-in) |
| Call/SMS buttons | `Linking` | `react-native` (built-in) |

### Modal + Animated Pattern (the core technique)

The panel is a `Modal` with `transparent={true}` and `animationType="none"` (we control our own animation). Inside the Modal, a `View` uses `justifyContent: 'flex-end'` to anchor the sheet to the bottom. The sheet's height is driven by `sheetHeight`, an `Animated.Value`.

```typescript
import { Animated, Dimensions, Modal, TouchableOpacity, ScrollView } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.20; // test between 0.15–0.25
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.90;

// In component:
const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
const [isExpanded, setIsExpanded] = useState(false);

const toggleSheet = () => {
  const toValue = isExpanded ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
  Animated.spring(sheetHeight, {
    toValue,
    useNativeDriver: false, // height animations cannot use native driver
    tension: 100,
    friction: 12,
  }).start();
  setIsExpanded(prev => !prev);
};

// Render:
<Modal
  visible={true}
  transparent={true}
  animationType="slide"
  onRequestClose={() => {}} // prevent Android back button from closing
>
  <View style={styles.overlay}>
    <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
      {/* Drag handle - tapping this toggles the sheet */}
      <TouchableOpacity onPress={toggleSheet} style={styles.handleContainer}>
        <View style={styles.dragHandle} />
      </TouchableOpacity>
      <ScrollView scrollEnabled={isExpanded}>
        {/* sheet content */}
      </ScrollView>
    </Animated.View>
  </View>
</Modal>
```

**Key styles**:
```typescript
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end', // anchor sheet to bottom
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleContainer: { alignItems: 'center', paddingVertical: 12 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#CCCCCC', borderRadius: 2 },
});
```

**Important**: `useNativeDriver: false` is required for height animations (layout properties can't run on the native thread). For two-state snapping, JS-thread animation performs fine. Tune `tension`/`friction` if the spring feels sluggish.

### Explicitly NOT Used: @gorhom/bottom-sheet

This library was attempted during TOW-51 and abandoned due to compatibility/reliability issues with this project's Expo setup. Do not attempt to use it for TOW-68.

### React Native Linking (Call/SMS)

No new package needed - built into React Native:
```typescript
import { Linking } from 'react-native';

// Call button
Linking.openURL(`tel:${commuterPhone}`);

// SMS button
Linking.openURL(`sms:${commuterPhone}`);
```

### expo-location

Already used in `app/(driver)/index.tsx`. Same pattern applies in the active trip screen.

### react-native-maps

Already used in the driver screen. No new setup required.

---

## Implementation Steps

### Step 1: Add `listenToTrip` to the firestore service

**File**: `/Users/chris/projects/towlink/services/firebase/firestore.ts`
**Action**: Add a new exported function that subscribes to a specific trip document.

**Concept**: This follows the exact same pattern as `listenForClaimedRequests`, but instead of querying a collection, you use `onSnapshot` on a single `doc()` reference.

**Code hint**:
```typescript
// Import needed: doc, onSnapshot (already imported)
export function listenToTrip(
  tripId: string,
  callback: (trip: Trip | null) => void
): () => void {
  const tripRef = doc(db, 'trips', tripId);

  return onSnapshot(tripRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.data();
    const trip: Trip = {
      id: snapshot.id,
      ...data,
      startTime: data.startTime?.toDate(),
      arrivalTime: data.arrivalTime?.toDate() ?? undefined,
      completionTime: data.completionTime?.toDate() ?? undefined,
    } as Trip;
    callback(trip);
  });
}
```

Also add a one-time fetch helper for commuter contact info:
```typescript
export async function getRequestById(requestId: string): Promise<Request | null>
// Uses getDoc(doc(db, 'requests', requestId)) - same pattern as getDocument in PATTERNS.md
```

---

### Step 2: Create the `useActiveTrip` hook

**File**: `/Users/chris/projects/towlink/hooks/use-active-trip.ts`
**Action**: Create a custom hook that manages the real-time trip listener and commuter data fetch.

**Concept**: Mirrors the pattern of `useClaimedRequest`. It accepts a `tripId`, subscribes to changes, and cleans up on unmount. It also does a one-time fetch of the request document to get commuter contact info.

**State to manage**:
- `trip: Trip | null`
- `commuterPhone: string | null`
- `commuterName: string | null`
- `loading: boolean`
- `error: string | null`

**Code pattern hint**:
```typescript
export function useActiveTrip(tripId: string | null) {
  const [trip, setTrip] = useState<Trip | null>(null);
  // ...other state

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);

    const unsubscribe = listenToTrip(tripId, (updatedTrip) => {
      setTrip(updatedTrip);
      setLoading(false);

      // One-time fetch for commuter contact (only once, when we first get the trip)
      if (updatedTrip && !commuterPhone) {
        fetchCommuterInfo(updatedTrip.requestId);
      }
    });

    return () => unsubscribe();
  }, [tripId]);

  return { trip, commuterName, commuterPhone, loading, error };
}
```

**Edge case**: The commuter phone fetch should only fire once. Use a `useRef` flag or check if `commuterPhone` is already set before fetching.

---

### Step 3: Create the ActiveTrip screen file

**File**: `/Users/chris/projects/towlink/app/(driver)/active-trip.tsx`
**Action**: Create the new screen. Start with the layout structure - full-screen map underneath, bottom sheet on top.

**Concept**: This screen uses `useLocalSearchParams` from expo-router to read the `tripId` passed as a URL parameter. The map fills the full screen, and the bottom sheet floats over it.

**Key layout concept**: The screen root is a `View` with `flex: 1`. The `MapView` also has `flex: 1`. The `ActiveTripSheet` renders its own transparent `Modal` internally, which floats over everything.

**Code hint for screen skeleton**:
```typescript
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ActiveTripScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { trip, commuterName, commuterPhone, loading } = useActiveTrip(tripId ?? null);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);

  // Get driver location on mount (same pattern as driver/index.tsx)

  // Handle trip completion - navigate back when trip is done
  useEffect(() => {
    if (trip?.status === 'completed' || trip?.status === 'cancelled') {
      router.replace('/(driver)');
    }
  }, [trip?.status]);

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} {/* region from driverLocation */}>
        {/* Driver location marker */}
        {/* Pickup location marker */}
      </MapView>

      <ActiveTripSheet
        trip={trip}
        commuterName={commuterName}
        commuterPhone={commuterPhone}
      />
    </View>
  );
}
```

**Navigation guard**: If `tripId` is undefined, redirect back immediately. Don't render the screen without a valid trip ID.

---

### Step 4: Create the `ActiveTripSheet` component

**File**: `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
**Action**: Build the bottom sheet component with collapsed and expanded content.

**Concept**: This component receives trip data as props and renders a transparent `Modal` containing an `Animated.View` whose height springs between `COLLAPSED_HEIGHT` (25%) and `EXPANDED_HEIGHT` (90%). A `ScrollView` inside allows the expanded content to scroll.

**Props interface**:
```typescript
interface ActiveTripSheetProps {
  trip: Trip | null;
  commuterName: string | null;
  commuterPhone: string | null;
  onStatusUpdate?: (newStatus: Trip['status']) => void;
}
```

**Sheet structure**:
```
Modal (transparent, always visible)
  └── View (overlay, justifyContent: 'flex-end')
        └── Animated.View (height driven by Animated.Value, white, rounded top corners)
              ├── TouchableOpacity (drag handle area - tap to toggle)
              │     └── View (gray drag handle bar, 40x4)
              ├── StatusBadge (e.g., "En Route to Pickup" - always visible)
              ├── CustomerRow (initials circle, name, call/SMS icon buttons)
              ├── Divider
              └── ScrollView (scrollEnabled={isExpanded})
                    ├── TripDetailsSection (service type, pickup address, dropoff address, fare)
                    ├── ProgressSteps (Drive / Service / Complete)
                    └── ActionButton (full-width green primary button)
```

**Status label mapping**:
```typescript
const STATUS_LABELS: Record<Trip['status'], string> = {
  en_route: 'En Route to Pickup',
  arrived: 'Arrived at Pickup',
  in_progress: 'Service in Progress',
  completed: 'Trip Completed',
  cancelled: 'Trip Cancelled',
};
```

**Status badge color from design**: Green background (`#E8F5E9`) with green text (`#2E7D32`) - matches "Active" badge in the design reference image.

**Collapsed content (visible at ~20% snap)**:
- Trip status text in colored badge (top of sheet)
- Customer name with initials circle
- Call button (phone icon circle)
- Text/SMS button (chat bubble icon circle)

**Expanded content (visible when scrolled at 90%)**:
- All of the above, plus:
- Service type row
- Pickup address
- Dropoff address
- Fare display (green, large)
- Progress steps (Drive to pickup / Provide service / Complete drop-off) - visual checklist
- Primary action button at the bottom

---

### Step 5: Add map markers for pickup and dropoff

**File**: `/Users/chris/projects/towlink/app/(driver)/active-trip.tsx`
**Action**: Add `Marker` components for pickup and dropoff locations on the MapView.

**Concept**: The `trip.pickupLocation` and `trip.dropoffLocation` are already `{ latitude, longitude }` objects that `react-native-maps` `Marker` accepts directly as `coordinate` prop.

**Code hint**:
```typescript
{trip?.pickupLocation && (
  <Marker
    coordinate={trip.pickupLocation}
    title="Pickup"
    pinColor="blue"
  />
)}
{trip?.dropoffLocation && (
  <Marker
    coordinate={trip.dropoffLocation}
    title="Dropoff"
    pinColor="red"
  />
)}
```

**Map region strategy**: When the screen loads, center the map on the driver's location. If driverLocation is null (still fetching), center on the pickup location as a fallback.

---

### Step 6: Implement Call and SMS buttons

**File**: `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
**Action**: Wire up the call and SMS icon buttons using `Linking`.

**Concept**: React Native's `Linking.openURL` can launch the phone dialer with `tel:` and the SMS app with `sms:`. Always check that the phone number exists before calling.

**Code hint**:
```typescript
const handleCall = () => {
  if (!commuterPhone) return;
  Linking.openURL(`tel:${commuterPhone}`).catch(() => {
    Alert.alert('Error', 'Could not open phone dialer');
  });
};

const handleSMS = () => {
  if (!commuterPhone) return;
  Linking.openURL(`sms:${commuterPhone}`).catch(() => {
    Alert.alert('Error', 'Could not open messages');
  });
};
```

**Design**: Two circular icon buttons side by side, next to the customer name. Use emoji icons matching existing codebase conventions (e.g., phone emoji, chat emoji) or use `@expo/vector-icons` if you want cleaner icons - it's already installed.

---

### Step 7: Wire up navigation from the driver home screen

**File**: `/Users/chris/projects/towlink/app/(driver)/index.tsx`
**Action**: Update `handleAcceptRequest` so that after successfully accepting, it navigates to the active trip screen.

**Concept**: `acceptClaimedRequest` already returns the `tripId`. Use `useRouter` from `expo-router` to navigate. Remove the `Alert.alert('Request Accepted!')` and replace with navigation.

**Code hint**:
```typescript
import { useRouter } from 'expo-router';

// Inside DriverScreen component:
const router = useRouter();

const handleAcceptRequest = useCallback(async () => {
  if (!claimedRequest || !user?.uid || isActioning) return;

  setIsActioning(true);
  try {
    const tripId = await acceptClaimedRequest(claimedRequest.id, user.uid);
    // Navigate to active trip screen, passing the tripId
    router.push(`/(driver)/active-trip?tripId=${tripId}`);
  } catch (error: any) {
    Alert.alert('Error', error.message);
  } finally {
    setIsActioning(false);
  }
}, [claimedRequest, user?.uid, isActioning, router]);
```

**Important**: The `RequestPopup` modal (the `<Modal>` component) will remain visible until navigation completes. This is fine for now - the modal closes naturally as the driver screen unmounts or because the request status is no longer 'claimed'. If the transition looks visually jarring, the popup can be explicitly dismissed before navigating (`showPopup` will become false once the request status changes to 'accepted', which `acceptClaimedRequest` sets in Firestore).

---

### Step 8: Add the active-trip screen to the driver layout

**File**: `/Users/chris/projects/towlink/app/(driver)/_layout.tsx`
**Action**: Register the new screen with the tab navigator or switch to a Stack approach for the driver group.

**Important consideration**: The current driver layout uses `<Tabs>`. The active trip screen should NOT appear in the tab bar - it's a full-screen workflow overlay.

**Two options**:

**Option A (Simpler)**: Add a Stack above/around the Tabs in the driver `_layout.tsx`. This is a common Expo Router pattern for modal-like screens within a tab group.

```typescript
// app/(driver)/_layout.tsx - modified to support stack navigation
import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="active-trip"
        options={{
          headerShown: false,
          // Prevent back gesture - driver shouldn't dismiss active trip
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
```

**Note**: Switching from Tabs to Stack for the driver layout means the tab bar disappears. This is actually correct UX - during an active trip, the driver should be focused on the trip screen only. The tab bar was only showing "Home" anyway.

**Option B**: Keep Tabs and use `router.push` which can navigate to screens outside the tab navigator. Expo Router supports this. The active-trip.tsx file just needs to exist in the `(driver)` directory.

**Recommendation**: Start with Option A (Stack) since it gives better control and cleaner UX for the active trip flow. The single "Home" tab isn't adding much at this stage.

---

### Step 9: Add trip status action button

**File**: `/Users/chris/projects/towlink/components/ActiveTripSheet.tsx`
**Action**: Add a primary action button at the bottom of the sheet that updates trip status.

**Concept**: The button label changes based on current `trip.status`. Pressing it calls `updateTripStatus` from the firestore service. This creates a simple linear progression through the state machine.

**Button states**:
```typescript
// en_route  →  button: "I've Arrived"  → sets status: 'arrived'
// arrived   →  button: "Start Service" → sets status: 'in_progress'
// in_progress → button: "Complete Trip" → sets status: 'completed'
```

**Note**: TOW-70 will implement the full trip state machine. For now, this is a basic linear flow. Keep the logic simple.

---

## File Structure Summary

```
New files:
  app/(driver)/active-trip.tsx         ← Main active trip screen
  components/ActiveTripSheet.tsx       ← Bottom sheet UI component
  hooks/use-active-trip.ts             ← Real-time trip listener hook

Modified files:
  app/(driver)/_layout.tsx             ← Switch to Stack navigator
  app/(driver)/index.tsx               ← Navigate after accepting request
  services/firebase/firestore.ts       ← Add listenToTrip + getRequestById
  types/models.ts                      ← No changes expected (Trip type is complete)
```

---

## Edge Cases

1. **`tripId` param is missing** - Check for null/undefined `tripId` on screen mount; if missing, `router.replace('/(driver)')` immediately. Never render the screen with a null tripId.

2. **Trip document does not exist** - The `listenToTrip` callback should handle `!snapshot.exists()` by calling `callback(null)`. The screen should show a loading/error state if `trip` is null for more than a few seconds.

3. **Trip is already completed/cancelled** - The `useEffect` in the screen that watches `trip.status` will navigate back automatically. The driver shouldn't see a completed trip screen.

4. **Commuter has no phone number** - The `commuterPhone` field is optional on the `User` model. If null, disable the call/SMS buttons with reduced opacity and show a "No phone on file" message or just hide the buttons.

5. **Driver location unavailable** - Fall back to centering the map on the pickup location. Map should still render even without driver location.

6. **Network loss during trip** - Firestore has offline persistence by default in the web SDK (which Firebase JS SDK uses). The last known trip state will be shown. Show a subtle "Offline" indicator if desired (out of scope for this story but worth noting).

7. **Double-tap on Accept** - Already handled by `isActioning` guard in `handleAcceptRequest`. No changes needed.

8. **Back button press** - On Android, the hardware back button should NOT exit the active trip screen mid-trip. Set `gestureEnabled: false` on the Stack screen and consider intercepting the hardware back press with `useBackHandler` from `react-native-gesture-handler`.

9. **`acceptClaimedRequest` returns tripId but tripId is empty string** - Add a guard: `if (!tripId) throw new Error('No trip ID returned')` before navigating.

---

## Design Reference Notes

From `.claude/design/screens/active_trip_modal.png`:

- **Status badge**: Light green background, green dot + "Service in progress" text, "Active" label on right
- **Customer row**: Initials circle (gray, "SL"), bold name, star rating (4.8), ride count, message + phone icon buttons
- **Info section**: White card with Service (Towing), Pickup address, Drop-off address, horizontal divider, Fare in green ($95.00)
- **Progress steps**: Three steps with circle checkmarks - completed steps are gray/checked, current step is solid green dot
- **Primary button**: Full-width green "Complete Trip" button at the very bottom
- **Map area**: Takes top ~40% of screen, location pin button (top right), compass/recenter button
- **Sheet background**: White with rounded top corners
- **Typography**: Bold customer name, medium weight for labels, green for prices

**Color palette from design**:
- Primary action: `#34C759` (green)
- Status badge bg: `#E8F5E9`
- Status text: `#2E7D32`
- Fare color: `#34C759`
- Address labels: `#666666`
- Address values: aligned to right edge

---

## Testing Strategy

### Manual Testing Scenarios

1. **Happy path**: Go online → receive request popup → accept → confirm navigation to active trip screen, RequestPopup dismisses
2. **Sheet interaction**: Tap drag handle → sheet expands to 90% → tap again → collapses to 25% (smooth spring animation)
3. **Call button**: Tap phone icon → device phone dialer opens with commuter number
4. **SMS button**: Tap message icon → device SMS app opens with commuter number
5. **Status progression**: Tap "I've Arrived" → button changes to "Start Service" → tap → button changes to "Complete Trip" → tap → navigates back to driver home
6. **Map markers**: Pickup and dropoff markers visible on map at correct coordinates
7. **Real-time update**: Manually update trip status in Firebase Console → UI updates without app restart
8. **No commuter phone**: Test with a request where commuterPhone is not set → Call/SMS buttons show as disabled

### Things to Verify

- Memory leaks: Confirm `onSnapshot` unsubscribes when leaving the screen (check console for warnings)
- Navigation: Android back button should not close the active trip screen mid-trip
- Loading state: Brief loading indicator shows while trip data is being fetched initially

---

## Dependencies

### No New Packages Needed
- `react-native` — `Modal`, `Animated`, `Dimensions`, `Linking`, `ScrollView` (all built-in)
- `react-native-maps: 1.20.1` — Map component (already installed)
- `expo-location: ~19.0.8` — GPS location (already installed)
- `firebase: ^12.4.0` — Firestore real-time listener (already installed)
- `expo-router` — Navigation: `useRouter`, `useLocalSearchParams` (already installed)

### Explicitly NOT Used
- `@gorhom/bottom-sheet` — abandoned during TOW-51 due to compatibility issues. Do not use.

### Prerequisite Work
- TOW-52 (Accept Request Logic) - DONE (`acceptClaimedRequest` exists and returns tripId)
- TOW-53 (Real-Time Request Listening) - DONE (`useClaimedRequest` hook exists)
- TOW-51 (RequestPopup UI) - DONE (component exists)

### Related Upcoming Story
- TOW-70 (Trip State Machine) - Will expand on the status update logic introduced here

---

## Implementation Order Recommendation

The steps above should be tackled in this order to keep the build working at each stage:

1. Step 1 - Add `listenToTrip` to firestore.ts (backend, testable in isolation)
2. Step 2 - Create `useActiveTrip` hook (logic, no UI yet)
3. Step 3 - Create skeleton `active-trip.tsx` with map only (basic screen renders)
4. Step 8 - Update `_layout.tsx` to use Stack (routing works, screen is reachable)
5. Step 7 - Wire navigation in `index.tsx` (end-to-end navigation flow works)
6. Step 4 - Build `ActiveTripSheet` with collapsed content only (basic bottom sheet visible)
7. Step 5 - Add map markers (map is complete)
8. Step 6 - Wire Call/SMS buttons (communication works)
9. Step 9 - Add status action button (trip progression works)
10. Polish - Match design reference colors/spacing, test spring animation feel
