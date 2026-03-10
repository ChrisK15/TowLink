# Technical Specification: TOW-16

## Story Reference

**Story**: US-2.4 — See Assigned Driver Details
**Branch**: `TOW-16-us-2-4-see-assigned-driver-details`
**Sprint**: TOW Sprint 3 (ends 2026-03-11)
**Points**: 8
**Design refs**:
- `Finding Driver` state: `.claude/design/screens/commuter_request_flow_3.png`
- `Driver Matched` transition: `.claude/design/screens/commuter_request_flow_4.png`
- `CommuterTripSheet` (collapsed + expanded): `.claude/design/screens/commuter_request_flow_5.png`

**Summary**: After a commuter submits a tow request, they currently see an Alert stub. This story replaces that stub with a real two-stage flow: (1) a `FindingDriverModal` that watches Firestore for a driver to accept, and (2) a `CommuterTripSheet` that tracks the trip in real time after the match.

---

## Architecture Overview

```
RequestServiceSheet
  (on submit)
      |
      v
FindingDriverModal  <-- watches requests/{requestId} for status === 'accepted'
      |
      | (status changes to 'accepted')
      v
CommuterScreen (map visible)
  + CommuterTripSheet  <-- watches trips/{tripId} for status changes
```

Two new components + one new hook + two new Firestore helpers.

The pattern mirrors the driver-side flow already in production:

| Driver side            | Commuter side (new)         |
|------------------------|-----------------------------|
| `useClaimedRequest`    | `useWatchRequest` (new)     |
| `RequestPopup`         | `FindingDriverModal` (new)  |
| `useActiveTrip`        | `useCommuterTrip` (new)     |
| `ActiveTripSheet`      | `CommuterTripSheet` (new)   |

---

## Technical Requirements

### Frontend Components

**Files to create:**
- `components/FindingDriverModal.tsx` — full-screen modal shown after request submission
- `components/CommuterTripSheet.tsx` — bottom sheet showing driver info and trip progress

**Files to modify:**
- `components/RequestServiceSheet.tsx` — replace the Alert stub with `FindingDriverModal`
- `app/(commuter)/index.tsx` — mount `CommuterTripSheet` when a trip is active

**New hooks (files to create):**
- `hooks/use-watch-request.ts` — real-time listener on a single request document
- `hooks/use-commuter-trip.ts` — real-time listener on trip + driver name/phone/vehicle

**Files to modify (Firestore service):**
- `services/firebase/firestore.ts` — add `listenToRequest()` and `cancelRequest()`

---

### State management

**In `RequestServiceSheet`:**
- After `createRequest()` resolves, store the returned `requestId` in new local state
- Set `showFindingDriverModal = true`

**In `CommuterScreen` (`app/(commuter)/index.tsx`):**
- New state: `activeTripId: string | null`
- Conditionally render `CommuterTripSheet` when `activeTripId` is set
- Hide the "Request Roadside Assistance" button when a trip is active

**In `FindingDriverModal`:**
- Receives `requestId` and an `onDriverFound` callback
- Uses `useWatchRequest` to react to request status changes
- When status becomes `'accepted'`, reads `matchedDriverId` to know the trip was created, then resolves the trip ID and calls `onDriverFound(tripId)`

**In `CommuterTripSheet`:**
- Uses `useCommuterTrip(tripId)` to get live trip + driver data
- Manages its own expanded/collapsed animation state (same pattern as `ActiveTripSheet`)

---

### Backend (Firebase)

**New Firestore functions in `services/firebase/firestore.ts`:**

```typescript
// Listen to a single request document for status changes
export function listenToRequest(
  requestId: string,
  callback: (request: Request | null) => void
): () => void

// Cancel a request by setting status to 'cancelled'
export async function cancelRequest(requestId: string): Promise<void>
```

`listenToRequest` wraps `onSnapshot(doc(db, 'requests', requestId), ...)` exactly as `listenToTrip` wraps the trips collection. Both functions already exist as the model.

**Existing Firestore functions used (no changes needed):**
- `listenToTrip(tripId, callback)` — already in firestore.ts, used by `useCommuterTrip`
- `getRequestById(requestId)` — already in firestore.ts, used to read driver name after match

**Finding the trip ID after a driver accepts:**
When a driver accepts, `acceptClaimedRequest` creates a trip document but the commuter does not know its ID directly. The solution is to query the `trips` collection where `requestId == requestId`. The `useWatchRequest` hook watches the request status; when it becomes `'accepted'`, the `useCommuterTrip` hook queries for the trip by `requestId`.

Add one more Firestore helper:

```typescript
// Find the trip document that was created for a given request
export async function getTripByRequestId(requestId: string): Promise<Trip | null>
```

This uses `query(collection(db, 'trips'), where('requestId', '==', requestId))` with `getDocs`.

**Firestore document shape (no schema changes needed):**

The `requests` document already has:
- `status: 'searching' | 'claimed' | 'accepted' | 'cancelled'`
- `matchedDriverId: string | null`

The `trips` document already has:
- `requestId: string`
- `commuterId: string`
- `driverId: string`
- `status: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'`
- `pickupAddress: string`
- `dropoffAddress: string`
- `estimatedPrice: number`

The `drivers` document (used to get driver name and vehicle) already has:
- `userId: string`
- `vehicleInfo: VehicleInfo`
  - `make`, `model`, `year`, `licensePlate`

**Driver name retrieval**: The `drivers` collection document does not store the name directly. The name lives in `users/{driverId}`. The `useCommuterTrip` hook will call `getDoc(doc(db, 'users', trip.driverId))` to get `user.name`. This is the same approach `useActiveTrip` uses to get `commuterName` via `getRequestById`.

**Security Rules**: No changes needed for MVP. The existing open rules (`allow read, write: if true`) cover these queries. This will be tightened in Phase 4 (TOW-57 already done for Sprint 3 rules).

---

## Component Specifications

### `FindingDriverModal`

**File**: `components/FindingDriverModal.tsx`

**Props:**
```typescript
interface FindingDriverModalProps {
  visible: boolean;
  requestId: string | null;
  onDriverFound: (tripId: string) => void;
  onCancel: () => void;
}
```

**Visual layout (from commuter_request_flow_3.png):**
- `Modal` with `animationType="slide"` and `presentationStyle="pageSheet"`
- Header row: "Finding Driver" (bold title), "Searching for available drivers..." subtitle, X close button top-right
- Center content area:
  - Large circular `ActivityIndicator` on a light-blue circle background (size="large", color="#1565C0")
  - Bold headline: "Finding the Best Available Driver"
  - Body text: "We're matching you with a qualified driver near your location. This usually takes a few seconds."
  - Three-dot animated loading indicator (see animation note below)
- Bottom pinned button: "Cancel Request" — outlined button, full width, calls `onCancel`

**Three-dot animation**: Use three `Animated.Value` instances cycling opacity 0 → 1 → 0 in sequence with staggered delays (dot 1: 0ms, dot 2: 200ms, dot 3: 400ms, loop every 1200ms). This creates the "..." pulse effect shown in the design.

**Behavior:**
1. When `visible` becomes true, start the dot animation loop
2. Call `useWatchRequest(requestId)` to watch for status change
3. When request status becomes `'accepted'`:
   - Call `getTripByRequestId(requestId)` to get the trip
   - Call `onDriverFound(trip.id)`
   - The parent will set `visible = false`
4. When user taps "Cancel Request":
   - Call `cancelRequest(requestId)` (sets request status to 'cancelled')
   - Call `onCancel()` to dismiss and reset parent state
5. Clean up animation loop on unmount

---

### `CommuterTripSheet`

**File**: `components/CommuterTripSheet.tsx`

**Props:**
```typescript
interface CommuterTripSheetProps {
  tripId: string;
  onTripCompleted: () => void;
}
```

**Internal data via `useCommuterTrip(tripId)`:**
```typescript
{
  trip: Trip | null;
  driverName: string | null;
  driverPhone: string | null;
  driverVehicle: VehicleInfo | null;
}
```

**Height constants (matching ActiveTripSheet pattern):**
```typescript
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.25;  // ~25% as per AC
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.90;   // ~90% as per AC
```

**Collapsed view (initial state) — from commuter_request_flow_5.png:**
- Drag handle pill (40×4px, grey)
- Blue status banner:
  - Small blue dot (pulse animation)
  - Text: "Driver en route to your location" (colour: #1565C0)
  - Right side: "Live" badge with refresh icon (Ionicons `refresh` size 12, colour #1565C0)
  - Below banner text: Large text "8 min away" (static for MVP; Sprint 4 adds live ETA)
- Driver info row:
  - Blue circular avatar (44px diameter) with driver initials (white text on `#1565C0` background)
  - Driver name (large, bold)
  - Call icon button (circular outlined, Ionicons `call-outline`)
  - Message icon button (circular outlined, Ionicons `chatbubble-outline`)

**Expanded view (tapping drag handle toggles) — from commuter_request_flow_5.png:**
All collapsed content stays at top, then below it:
- Vehicle card:
  - Two columns: "Vehicle" label + `{year} {make} {model}` | "License" label + `{licensePlate}`
  - Styled as a rounded card with `#F8F8F8` background
- Progress checklist (same `ProgressStep` component pattern as `ActiveTripSheet`):

  | Step label                           | `done` condition                                              | `active` condition              | subtitle                                 |
  |--------------------------------------|---------------------------------------------------------------|---------------------------------|------------------------------------------|
  | "Driver en route to your location"   | `['arrived','in_progress','completed'].includes(status)`      | `status === 'en_route'`         | `trip.pickupAddress`                     |
  | "Driver arrived"                     | `['in_progress','completed'].includes(status)`                | `status === 'arrived'`          | "Waiting to start service"              |
  | "Service in progress"                | `status === 'completed'`                                      | `status === 'in_progress'`      | "Estimated 15-20 minutes"               |
  | "Complete"                           | `status === 'completed'`                                      | `status === 'completed'`        | "Rate your experience"                  |

- Safety banner (blue info box):
  - Ionicons `information-circle-outline` icon
  - Bold label "Safety First"
  - Body: "Stay in a safe location and keep your phone on. The driver will contact you when nearby."
  - Background: `#E3F2FD` (light blue), rounded corners
- Red "Cancel Trip" button (full width, `#FF3B30`)

**ScrollView**: Wrap the expanded content (vehicle card, progress steps, safety banner, cancel button) in a `ScrollView` that is only `scrollEnabled` when `isExpanded === true`, matching `ActiveTripSheet`.

**Trip completion behavior**: When `useCommuterTrip` returns `trip.status === 'completed'`, call `onTripCompleted()`. For MVP this dismisses the sheet and resets the commuter screen to its initial state.

**Call/Message buttons:**
```typescript
const handleCall = () => Linking.openURL(`tel:${driverPhone}`);
const handleSMS = () => Linking.openURL(`sms:${driverPhone}`);
```
Only render these buttons when `driverPhone` is not null.

---

### `useWatchRequest` hook

**File**: `hooks/use-watch-request.ts`

```typescript
export function useWatchRequest(requestId: string | null) {
  // Returns { request: Request | null, loading: boolean }
  // Uses listenToRequest() from firestore.ts
  // Cleans up listener on unmount or when requestId changes
}
```

Modelled after `useClaimedRequest`. When `requestId` is null, returns `{ request: null, loading: false }`.

---

### `useCommuterTrip` hook

**File**: `hooks/use-commuter-trip.ts`

```typescript
export function useCommuterTrip(tripId: string | null) {
  // Returns { trip, driverName, driverPhone, driverVehicle, loading, error }
  // 1. Uses listenToTrip(tripId, callback) for real-time trip updates
  // 2. On first trip load, fetches driver profile once:
  //    - getDoc(doc(db, 'users', trip.driverId)) → driverName, driverPhone
  //    - getDoc(doc(db, 'drivers', trip.driverId)) → driverVehicle (vehicleInfo)
  // Uses a driverFetchedRef (same pattern as useActiveTrip's commuterFetchedRef)
}
```

Note: `useActiveTrip` uses `getRequestById(trip.requestId)` to find the commuter name because the commuter info is on the request document. For `useCommuterTrip`, the driver info is split across two documents (`users/` for name/phone and `drivers/` for vehicleInfo). The hook fetches both in parallel with `Promise.all`.

---

## Integration — `RequestServiceSheet.tsx`

Replace the TODO stub at the end of `handleSubmit`:

**Current (lines 258-259):**
```typescript
handleClose();
// TODO TOW-16: Replace with FindingDriverModal navigation
Alert.alert('Request Submitted!', 'Looking for a driver near you...');
```

**New behavior:**
```typescript
// DO NOT call handleClose() here — keep the sheet open (or close it)
// Set the requestId so FindingDriverModal becomes visible
setActiveRequestId(docRef); // docRef is the return value of createRequest()
setShowFindingModal(true);
handleClose();              // Close RequestServiceSheet
```

`RequestServiceSheet` needs two new props:

```typescript
interface RequestServiceSheetProps {
  visible: boolean;
  onClose: () => void;
  onRequestCreated: (requestId: string) => void;  // NEW
}
```

The parent (`CommuterScreen`) will receive this callback and use it to:
1. Store `requestId` in state
2. Show `FindingDriverModal`

---

## Integration — `app/(commuter)/index.tsx`

Add these state variables:
```typescript
const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
const [showFindingModal, setShowFindingModal] = useState(false);
const [activeTripId, setActiveTripId] = useState<string | null>(null);
```

Update JSX to include both new components:
```tsx
<RequestServiceSheet
  visible={showServiceSheet}
  onClose={() => setShowServiceSheet(false)}
  onRequestCreated={(requestId) => {
    setActiveRequestId(requestId);
    setShowFindingModal(true);
  }}
/>

<FindingDriverModal
  visible={showFindingModal}
  requestId={activeRequestId}
  onDriverFound={(tripId) => {
    setShowFindingModal(false);
    setActiveTripId(tripId);
  }}
  onCancel={() => {
    setShowFindingModal(false);
    setActiveRequestId(null);
  }}
/>

{activeTripId && (
  <CommuterTripSheet
    tripId={activeTripId}
    onTripCompleted={() => {
      setActiveTripId(null);
      setActiveRequestId(null);
    }}
  />
)}
```

Hide the "Request Roadside Assistance" button when `activeTripId` is not null (user is already in a trip).

---

## Implementation Steps

### Step 1 — Add Firestore helpers

**File**: `services/firebase/firestore.ts`

Add two new exported functions at the bottom of the file:

**`listenToRequest`**: wraps `onSnapshot` on a single request document. Follow the exact same pattern as the existing `listenToTrip` function (lines 312-332). Convert timestamps using `.toDate()` for `createdAt` and `expiresAt`. Return the unsubscribe function.

**`cancelRequest`**: calls `updateDoc(doc(db, 'requests', requestId), { status: 'cancelled' })`.

**`getTripByRequestId`**: uses `getDocs(query(collection(db, 'trips'), where('requestId', '==', requestId)))`. Returns the first result as a `Trip` object or `null`. Remember to import `getDocs` from `firebase/firestore` (it's not currently imported — add it).

---

### Step 2 — Create `useWatchRequest` hook

**File**: `hooks/use-watch-request.ts`

Structure it identically to `useClaimedRequest`. The key difference: `useClaimedRequest` queries a collection; this hook listens to a single document by ID using `listenToRequest`.

```typescript
import { listenToRequest } from '@/services/firebase/firestore';
import { Request } from '@/types/models';
import { useEffect, useState } from 'react';

export function useWatchRequest(requestId: string | null) {
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    const unsubscribe = listenToRequest(requestId, (updated) => {
      setRequest(updated);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [requestId]);

  return { request, loading };
}
```

---

### Step 3 — Create `useCommuterTrip` hook

**File**: `hooks/use-commuter-trip.ts`

Model it after `useActiveTrip` but fetch from `users/` and `drivers/` collections instead of `requests/`.

```typescript
import { useState, useEffect, useRef } from 'react';
import { Trip, VehicleInfo } from '@/types/models';
import { listenToTrip } from '@/services/firebase/firestore';
import { db } from '@/services/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export function useCommuterTrip(tripId: string | null) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [driverPhone, setDriverPhone] = useState<string | null>(null);
  const [driverVehicle, setDriverVehicle] = useState<VehicleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const driverFetchedRef = useRef(false);

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    const unsubscribe = listenToTrip(tripId, async (updatedTrip) => {
      if (!updatedTrip) {
        setError('Trip not found');
        return;
      }
      setTrip(updatedTrip);
      setLoading(false);

      if (!driverFetchedRef.current) {
        driverFetchedRef.current = true;
        const [userSnap, driverSnap] = await Promise.all([
          getDoc(doc(db, 'users', updatedTrip.driverId)),
          getDoc(doc(db, 'drivers', updatedTrip.driverId)),
        ]);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setDriverName(userData.name ?? null);
          setDriverPhone(userData.phone ?? null);
        }
        if (driverSnap.exists()) {
          setDriverVehicle(driverSnap.data().vehicleInfo ?? null);
        }
      }
    });
    return () => unsubscribe();
  }, [tripId]);

  return { trip, driverName, driverPhone, driverVehicle, loading, error };
}
```

---

### Step 4 — Create `FindingDriverModal`

**File**: `components/FindingDriverModal.tsx`

Key implementation notes:

1. Use `Modal` with `animationType="slide"` and `presentationStyle="pageSheet"` (same as `RequestPopup`).

2. Three-dot animation — use `useEffect` that runs when `visible` is true. Create refs for three `Animated.Value` instances. Inside the effect, create a looping sequence:
   ```
   Animated.loop(
     Animated.sequence([
       Animated.parallel([dot1FadeIn, dot2FadeIn delayed, dot3FadeIn delayed]),
       pause,
       Animated.parallel([dot1FadeOut, dot2FadeOut, dot3FadeOut]),
       pause,
     ])
   ).start()
   ```
   Clean up with `animation.stop()` on return.

3. The `useWatchRequest` hook is called inside this component with the `requestId` prop.

4. Watch for `request?.status === 'accepted'` in a `useEffect`. When it fires:
   ```typescript
   useEffect(() => {
     if (request?.status === 'accepted') {
       getTripByRequestId(requestId).then((trip) => {
         if (trip) onDriverFound(trip.id);
       });
     }
   }, [request?.status]);
   ```

5. Import `getTripByRequestId` from `@/services/firebase/firestore`.

6. The X button in the top-right header calls `onCancel()` (does NOT cancel the Firestore request — it just dismisses for the user if they accidentally opened it). The "Cancel Request" button at the bottom does call `cancelRequest(requestId)` then `onCancel()`.

   This is a subtle but important UX distinction: tapping X is a UI dismiss; tapping "Cancel Request" is a data operation.

---

### Step 5 — Create `ProgressStep` helper in `CommuterTripSheet`

The `ProgressStep` component in `ActiveTripSheet.tsx` is a module-level function that is not exported. For `CommuterTripSheet`, define an identical `ProgressStep` component locally. Do not import from `ActiveTripSheet` (it is not exported and the two components will eventually diverge).

Copy the `ProgressStep` function and its `stepStyles` StyleSheet as-is from `ActiveTripSheet.tsx` into `CommuterTripSheet.tsx`. The logic is identical; only the step data differs.

---

### Step 6 — Create `CommuterTripSheet`

**File**: `components/CommuterTripSheet.tsx`

Key implementation notes:

1. Collapsed height is `SCREEN_HEIGHT * 0.25` (design shows ~25%). Expanded is `SCREEN_HEIGHT * 0.90`.

2. The blue dot pulse animation next to "Driver en route" text: a single `Animated.Value` looping between scale 0.8 and 1.2 with `Animated.loop(Animated.sequence([...]))`.

3. For MVP, ETA is hardcoded as `"8 min away"`. Add a `// TODO Sprint 4: Replace with live ETA` comment.

4. Status banner text should update based on `trip.status`:
   ```typescript
   const STATUS_BANNER_TEXT: Record<string, string> = {
     en_route: 'Driver en route to your location',
     arrived: 'Driver has arrived',
     in_progress: 'Service in progress',
     completed: 'Trip complete',
   };
   ```

5. Avatar initials: split `driverName` on spaces, take first character of each word:
   ```typescript
   driverName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??'
   ```

6. Call/message icon buttons use `Ionicons` from `@expo/vector-icons` (already used in `ActiveTripSheet`):
   - Call: `<Ionicons name="call-outline" size={20} />`
   - Message: `<Ionicons name="chatbubble-outline" size={20} />`
   Wrap each in a `TouchableOpacity` with a circular outlined style (border `#1565C0`, radius 20).

7. Vehicle card layout (from design):
   ```
   | Vehicle          |  License    |
   | 2023 Freightliner M2 | TW-4892 |
   ```
   Use a `View` with `flexDirection: 'row'` and two child `View`s each with `flex: 1`.

8. Steps array (derive from `trip.status`):
   ```typescript
   const steps = [
     {
       label: 'Driver en route to your location',
       done: ['arrived', 'in_progress', 'completed'].includes(trip?.status ?? ''),
       active: trip?.status === 'en_route',
       subtitle: trip?.pickupAddress ?? '',
     },
     {
       label: 'Driver arrived',
       done: ['in_progress', 'completed'].includes(trip?.status ?? ''),
       active: trip?.status === 'arrived',
       subtitle: 'Waiting to start service',
     },
     {
       label: 'Service in progress',
       done: trip?.status === 'completed',
       active: trip?.status === 'in_progress',
       subtitle: 'Estimated 15-20 minutes',
     },
     {
       label: 'Complete',
       done: trip?.status === 'completed',
       active: trip?.status === 'completed',
       subtitle: 'Rate your experience',
     },
   ];
   ```

9. Trip completion effect:
   ```typescript
   useEffect(() => {
     if (trip?.status === 'completed') {
       onTripCompleted();
     }
   }, [trip?.status]);
   ```

---

### Step 7 — Update `RequestServiceSheet`

**File**: `components/RequestServiceSheet.tsx`

1. Add the `onRequestCreated` prop to the interface.
2. In `handleSubmit`, capture the return value of `createRequest()` (it already returns `Promise<string>`).
3. Replace the Alert stub with:
   ```typescript
   const requestId = await createRequest(...);
   handleClose();
   onRequestCreated(requestId);
   ```

Note: `createRequest` in `firestore.ts` already returns the document ID (`docRef.id`). No changes needed to the Firestore function itself.

---

### Step 8 — Update `app/(commuter)/index.tsx`

1. Add the three new state variables: `activeRequestId`, `showFindingModal`, `activeTripId`.
2. Wire `onRequestCreated` on `RequestServiceSheet`.
3. Mount `FindingDriverModal` below `RequestServiceSheet` in the JSX.
4. Mount `CommuterTripSheet` conditionally when `activeTripId` is set.
5. Hide the "Request Roadside Assistance" button when `activeTripId !== null`.
6. Import all new components.

---

## Edge Cases

1. **Driver accepts before commuter opens modal** — The `useWatchRequest` hook will immediately see status as `'accepted'` on first snapshot and fire `onDriverFound`. This is correct behaviour.

2. **Request cancelled from the driver side while modal is open** — The request status will change to something unexpected. Add a guard: if `request?.status === 'cancelled'`, call `onCancel()` automatically with an Alert: "Your request was cancelled. Please try again."

3. **`getTripByRequestId` returns null** — This could happen if there is a brief lag between the request status update and the trip document creation (both happen in `acceptClaimedRequest` but there is no atomic guarantee between the Firestore write and the client read). Add a retry: if the result is null, wait 1 second and try once more. Show an Alert and call `onCancel()` if it fails twice.

4. **User kills app during FindingDriverModal** — On next app launch, `activeTripId` and `showFindingModal` states are gone. For MVP, the commuter will see the normal home screen. Sprint 4 will add persistence (check for an active trip on launch using a query against `trips` filtered by `commuterId` and status not in `['completed', 'cancelled']`).

5. **Trip completes while sheet is collapsed** — The `useCommuterTrip` hook fires on every status change regardless of sheet expansion state. `onTripCompleted()` will be called correctly.

6. **`driverName` is null (driver has no `name` field in users collection)** — Show "Driver" as fallback text and "??" as initials fallback. Both are already handled in the code hints above.

7. **User taps "Cancel Trip" from `CommuterTripSheet`** — For MVP, show a confirmation `Alert.alert` with two buttons: Cancel (dismiss) and Confirm. On confirm, call `updateTripStatus(tripId, 'cancelled')` from `firestore.ts` (function already exists). Then `onTripCompleted()` will fire from the `useEffect` watching status.

---

## Testing Strategy

**Manual test scenarios (test with two devices — one commuter, one driver):**
1. Submit a request as commuter → `FindingDriverModal` appears immediately with loading animation.
2. Accept the request as driver → modal auto-dismisses, `CommuterTripSheet` appears collapsed.
3. Verify driver name, initials, and vehicle info appear in the sheet.
4. Tap drag handle → sheet expands, all four progress steps visible.
5. Advance trip status to `arrived` as driver → first step checks off with spring animation.
6. Advance to `in_progress` → second step checks off.
7. Advance to `completed` → third and fourth steps check off, sheet dismisses, home screen resets.
8. Test "Cancel Request" button in `FindingDriverModal` → request doc status becomes `'cancelled'`.
9. Test "Cancel Trip" button in `CommuterTripSheet` → confirmation dialog, trip status becomes `'cancelled'`.

**Single-device testing (driver accepts from Firestore Console):**
- Manually change `requests/{id}.status` from `searching` to `accepted` and set `matchedDriverId` to any driver UID.
- Then manually create a matching trip document — copy the pattern from `acceptClaimedRequest` in `firestore.ts`.
- This lets you test the commuter flow without needing a second device.

---

## Dependencies

**No new npm packages required.** All dependencies are already installed:
- `firebase/firestore` — `onSnapshot`, `doc`, `collection`, `query`, `where`, `getDocs`
- `react-native` — `Animated`, `Modal`, `ScrollView`, `Dimensions`, `Linking`
- `@expo/vector-icons` — `Ionicons` (already used in `ActiveTripSheet`)

**Firestore composite index**: The query `where('requestId', '==', requestId)` on the `trips` collection is a simple equality filter and does not require a composite index. No Firebase Console changes needed.

**Files changed summary:**

| File | Type | Action |
|------|------|--------|
| `services/firebase/firestore.ts` | Service | Add 3 functions |
| `hooks/use-watch-request.ts` | Hook | Create new |
| `hooks/use-commuter-trip.ts` | Hook | Create new |
| `components/FindingDriverModal.tsx` | Component | Create new |
| `components/CommuterTripSheet.tsx` | Component | Create new |
| `components/RequestServiceSheet.tsx` | Component | Modify (add prop + wire return value) |
| `app/(commuter)/index.tsx` | Screen | Modify (add state + mount new components) |

---

*Spec created by: technical-architect agent*
*Date: 2026-03-10*
*For: TOW-16 — US-2.4: See Assigned Driver Details*
