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

### ~~Step 3: Create the `active-trip.tsx` screen skeleton~~ — REMOVED (architecture pivot)
### ~~Step 4: Update `_layout.tsx` to Stack navigator~~ — REMOVED (architecture pivot)
### ~~Step 5: Wire navigation in `index.tsx`~~ — REPLACED by Step 3 below

---

### Step 3: Update `index.tsx` to manage active trip state
**File**: `app/(driver)/index.tsx`
**Learning objective**: Understand state-driven UI — instead of navigating to a new screen, a state change (`activeTripId`) determines what's rendered over the same map.
**What you'll build**:
- Add `activeTripId` state (`useState<string | null>(null)`)
- Call `useActiveTrip(activeTripId)` to get live trip data
- Update `handleAcceptRequest` to call `setActiveTripId(tripId)` instead of navigating
- Conditionally render `ActiveTripSheet` when `activeTripId` is set
- Clear `activeTripId` when trip status becomes `completed` or `cancelled`
**Key concept**: The map is always the backdrop. State determines what UI layers on top of it.

---

### Step 4: Build the `ActiveTripSheet` component
**File**: `components/ActiveTripSheet.tsx`
**Learning objective**: Learn how `Animated.Value` drives layout changes (specifically height), and how `Animated.spring` creates smooth, physics-based transitions between two snap points.
**What you'll build**: The bottom sheet component - a transparent `Modal` containing an `Animated.View` that springs between 25% and 90% of screen height when the drag handle is tapped.
**Key concept**: `useNativeDriver: false` is required for any animation that changes layout properties like `height`. This is a JS-thread animation, which is fine for two-state snapping.

---

### Step 5: Add map markers for pickup and dropoff
**File**: `app/(driver)/index.tsx`
**Learning objective**: Practice rendering conditional `Marker` components on a MapView using coordinates from a Firestore document.
**What you'll build**: Blue marker for pickup, red marker for dropoff, both using coordinates from `trip.pickupLocation` and `trip.dropoffLocation`. Only rendered when an active trip exists.
**Key concept**: Markers are optional and should be conditionally rendered with `trip?.pickupLocation && (...)`. The coordinate prop expects `{ latitude, longitude }` which matches your Firestore data directly.

---

### Step 6: Wire Call and SMS buttons
**File**: `components/ActiveTripSheet.tsx`
**Learning objective**: Learn how to use React Native's `Linking` API to launch the phone dialer and SMS app from inside your app.
**What you'll build**: Two icon buttons (phone and chat) that call `Linking.openURL('tel:...')` and `Linking.openURL('sms:...')` respectively, with graceful error handling.
**Key concept**: `Linking` is built into React Native - no new packages. Always wrap `Linking.openURL` in a `.catch()` because the URL scheme might not be supported (e.g., on simulators).

---

### Step 7: Add the trip status action button + handle completion
**File**: `components/ActiveTripSheet.tsx`, `app/(driver)/index.tsx`
**Learning objective**: Practice mapping UI state to business logic - different button labels based on trip status, wired to a Firestore update function that already exists.
**What you'll build**: A full-width primary button at the bottom of the sheet whose label and action changes based on `trip.status`: "I've Arrived" → "Start Service" → "Complete Trip". When trip is completed/cancelled, clear `activeTripId` in `index.tsx` to return the screen to its waiting state.
**Key concept**: `updateTripStatus` already exists in `firestore.ts`. The real-time listener in `useActiveTrip` picks up the status change automatically.

---

## Completed Steps
- [x] Step 1: Add `listenToTrip` and `getRequestById` to `services/firebase/firestore.ts`
  - Used `onSnapshot` on a single `doc()` reference (not a query)
  - Learned why `snapshot.exists()` needs `()` — it's a method, not a property
  - Learned why early return is needed here but not in `listenForClaimedRequests`
  - Proper Timestamp conversions: `startTime.toDate()`, optional chaining for nullable fields
- [x] Step 2: Create `useActiveTrip` hook in `hooks/use-active-trip.ts`
- [x] Step 3: Update `app/(driver)/index.tsx` to manage active trip state
  - Added `activeTripId` state and `useActiveTrip` hook call
  - `handleAcceptRequest` now captures `tripId` and calls `setActiveTripId` instead of Alert
  - `useEffect` watches `trip?.status` — clears `activeTripId` on completion/cancellation
  - Caught duplicate `acceptClaimedRequest` call bug (would've caused a transaction error)
  - Combined real-time listener with a one-time async fetch for commuter info
  - Used `useRef` flag to prevent `getRequestById` from firing on every snapshot
  - Learned why `useRef` is better than `useState` for a non-rendering flag
  - Added return type `Promise<Request | null>` to `getRequestById` and used `as Request` cast for Firestore's generic `DocumentData`

## Current Step
- [ ] Step 4: Build `ActiveTripSheet` component

## Remaining Steps
- [ ] Step 4: Build `ActiveTripSheet` component
- [ ] Step 4: Build `ActiveTripSheet` component with collapsed content and animation
- [ ] Step 5: Add pickup and dropoff map markers to `index.tsx`
- [ ] Step 6: Wire Call and SMS buttons in `ActiveTripSheet`
- [ ] Step 7: Add trip status action button + handle trip completion

## Notes
- **Architecture pivot**: Single-screen approach. The map in `index.tsx` is always visible. `activeTripId` state determines what UI overlays on top of it. No separate screen, no Stack navigator change.
- `@gorhom/bottom-sheet` was abandoned during TOW-51. Do NOT use it. Stick to `Modal` + `Animated`.
- `acceptClaimedRequest` in `firestore.ts` already returns `tripId` - no backend changes needed there.
- `updateTripStatus` already exists in `firestore.ts` - Step 7 just needs to call it.
- The commuter's phone/name is NOT stored on the trip document - it lives on the `requests/{requestId}` document. That's why Step 2 needs a one-time fetch.
