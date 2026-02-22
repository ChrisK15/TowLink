# Implementation Progress: TOW-68

## Story
Active Trip Screen with Expandable Modal

---

## Lesson Plan

### Step 1: Add `listenToTrip` to the Firestore service
**File**: `services/firebase/firestore.ts`
**Learning objective**: Understand the difference between listening to a collection (query) vs. a single document (doc ref). Practice reading the existing `listenForClaimedRequests` pattern and adapting it.
**What you'll build**: Two new exported functions - `listenToTrip` (real-time) and `getRequestById` (one-time fetch).
**Key concept**: `onSnapshot` works on both collections AND single documents. A single-doc listener uses `doc(db, 'collection', id)` instead of a `query(...)`.

---

### Step 2: Create the `useActiveTrip` hook
**File**: `hooks/use-active-trip.ts`
**Learning objective**: Practice building a custom hook that combines a real-time listener with a one-time async fetch. Understand why you need a `useRef` flag to prevent fetching commuter info more than once.
**What you'll build**: A hook that accepts a `tripId`, subscribes to the trip document in real-time, and does a single fetch to get the commuter's contact info from the linked request document.
**Key concept**: Hooks are just functions that use other hooks. Model it closely on `useClaimedRequest` but add the async `getRequestById` side-fetch.

---

### Step 3: Create the `active-trip.tsx` screen skeleton (map only)
**File**: `app/(driver)/active-trip.tsx`
**Learning objective**: Learn how to receive route parameters in Expo Router using `useLocalSearchParams`. Build a screen that reads from a custom hook and shows the map.
**What you'll build**: A bare-bones screen with a full-screen `MapView`, driver location marker, and a navigation guard (redirect if no `tripId`).
**Key concept**: Expo Router passes URL parameters as strings. `useLocalSearchParams<{ tripId: string }>()` is how you read them with TypeScript types.

---

### Step 4: Update `_layout.tsx` to use Stack navigation
**File**: `app/(driver)/_layout.tsx`
**Learning objective**: Understand the difference between `Tabs` and `Stack` navigators. Learn why an active trip screen does NOT belong in a tab bar - it's a full-screen workflow.
**What you'll build**: Switch the driver layout from `<Tabs>` to `<Stack>`, registering both `index` and `active-trip` screens, with `gestureEnabled: false` on the trip screen.
**Key concept**: In Expo Router, each file in a directory can be a screen. The `_layout.tsx` controls HOW those screens are presented (tabs, stack, modal, etc.).

---

### Step 5: Wire navigation in `index.tsx` (accept -> navigate)
**File**: `app/(driver)/index.tsx`
**Learning objective**: Practice using `useRouter` from expo-router to programmatically navigate after an async action completes.
**What you'll build**: Update `handleAcceptRequest` to capture the returned `tripId` and call `router.push('/(driver)/active-trip?tripId=...')` instead of showing an Alert.
**Key concept**: `acceptClaimedRequest` already returns the `tripId`. You just need to store it and use it to navigate. The navigation should happen inside the `try` block, after the await.

---

### Step 6: Build the `ActiveTripSheet` component with collapsed content
**File**: `components/ActiveTripSheet.tsx`
**Learning objective**: Learn how `Animated.Value` drives layout changes (specifically height), and how `Animated.spring` creates smooth, physics-based transitions between two snap points.
**What you'll build**: The bottom sheet component - a transparent `Modal` containing an `Animated.View` that springs between 25% and 90% of screen height when the drag handle is tapped.
**Key concept**: `useNativeDriver: false` is required for any animation that changes layout properties like `height`. This is a JS-thread animation, which is fine for two-state snapping.

---

### Step 7: Add map markers for pickup and dropoff
**File**: `app/(driver)/active-trip.tsx`
**Learning objective**: Practice rendering conditional `Marker` components on a MapView using coordinates from a Firestore document.
**What you'll build**: Blue marker for pickup, red marker for dropoff, both using coordinates from `trip.pickupLocation` and `trip.dropoffLocation`.
**Key concept**: Markers are optional and should be conditionally rendered with `trip?.pickupLocation && (...)`. The coordinate prop expects `{ latitude, longitude }` which matches your Firestore data directly.

---

### Step 8: Wire Call and SMS buttons
**File**: `components/ActiveTripSheet.tsx`
**Learning objective**: Learn how to use React Native's `Linking` API to launch the phone dialer and SMS app from inside your app.
**What you'll build**: Two icon buttons (phone and chat) that call `Linking.openURL('tel:...')` and `Linking.openURL('sms:...')` respectively, with graceful error handling.
**Key concept**: `Linking` is built into React Native - no new packages. Always wrap `Linking.openURL` in a `.catch()` because the URL scheme might not be supported (e.g., on simulators).

---

### Step 9: Add the trip status action button
**File**: `components/ActiveTripSheet.tsx`
**Learning objective**: Practice mapping UI state to business logic - different button labels based on trip status, wired to a Firestore update function that already exists.
**What you'll build**: A full-width primary button at the bottom of the sheet whose label and action changes based on `trip.status`: "I've Arrived" → "Start Service" → "Complete Trip".
**Key concept**: `updateTripStatus` already exists in `firestore.ts`. You just need to call it with the right next status. The `useEffect` in the screen will handle navigation back when status becomes `'completed'`.

---

## Completed Steps
_(none yet)_

## Current Step
- [ ] Step 1: Add `listenToTrip` and `getRequestById` to `services/firebase/firestore.ts`

## Remaining Steps
- [ ] Step 1: Add `listenToTrip` and `getRequestById` to firestore service
- [ ] Step 2: Create `useActiveTrip` hook
- [ ] Step 3: Create `active-trip.tsx` screen skeleton (map + location)
- [ ] Step 4: Update `_layout.tsx` to use Stack navigator
- [ ] Step 5: Wire navigation in `index.tsx` after accepting request
- [ ] Step 6: Build `ActiveTripSheet` component with collapsed content and animation
- [ ] Step 7: Add pickup and dropoff map markers to `active-trip.tsx`
- [ ] Step 8: Wire Call and SMS buttons in `ActiveTripSheet`
- [ ] Step 9: Add trip status action button to `ActiveTripSheet`

## Notes
- `@gorhom/bottom-sheet` was abandoned during TOW-51. Do NOT use it. Stick to `Modal` + `Animated`.
- `acceptClaimedRequest` in `firestore.ts` already returns `tripId` - no backend changes needed there.
- `updateTripStatus` already exists in `firestore.ts` - Step 9 just needs to call it.
- The commuter's phone/name is NOT stored on the trip document - it lives on the `requests/{requestId}` document. That's why Step 2 needs a one-time fetch.
- `_layout.tsx` currently uses `<Tabs>` with a single "Home" tab. Switching to `<Stack>` is the right call - no real tab bar is needed for the driver workflow at this stage.
