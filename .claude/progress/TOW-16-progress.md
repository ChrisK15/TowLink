# Implementation Progress: TOW-16

## Story
US-2.4 — See Assigned Driver Details
Branch: `TOW-16-us-2-4-see-assigned-driver-details`

---

## Completed Steps
- [x] Step 1: Add Firestore helper functions (`listenToRequest` written and verified)
- [x] Step 2: Create `useWatchRequest` hook (`hooks/use-watch-request.ts`)
- [x] Step 3: Create `useCommuterTrip` hook (`hooks/use-commuter-trip.ts`)
- [x] Step 4: Create `FindingDriverModal` component (`components/FindingDriverModal.tsx`)
  - Also added `cancelRequest` and `getTripByRequestId` to `firestore.ts`
  - Also added `getDocs` to firestore imports
- [x] Step 5: Create `CommuterTripSheet` component (`components/CommuterTripSheet.tsx`)
- [x] Step 6: Wire `RequestServiceSheet` — added `onRequestCreated` prop, replaced Alert stub
- [x] Step 7: Wire `app/(commuter)/index.tsx` — mounted `FindingDriverModal` and `CommuterTripSheet`
- [x] Step 8: Manual end-to-end test — all flows verified working

## Current Step
_All steps complete. TOW-16 done._

## Remaining Steps
- [ ] Step 4: Create `FindingDriverModal` component
- [ ] Step 5: Create `CommuterTripSheet` component
- [ ] Step 6: Wire `RequestServiceSheet` — replace the Alert stub
- [ ] Step 7: Wire `app/(commuter)/index.tsx` — mount new components
- [ ] Step 8: Manual end-to-end test

---

## Step-by-Step Lesson Plan

---

### Step 1: Add Firestore Helper Functions

**File to edit**: `services/firebase/firestore.ts`

**What you will learn**: How Firestore real-time listeners work on a single document (as opposed to a collection query). You will also practice adding a one-shot query function.

**Three functions to add at the bottom of the file:**

**A. `listenToRequest(requestId, callback)`**
- This is a real-time listener, just like `listenToTrip` which already exists at line 312.
- The only difference is the collection name (`'requests'` instead of `'trips'`) and the fields you convert from Timestamps.
- Look at `listenToTrip` carefully — notice how it uses `onSnapshot(doc(db, 'trips', tripId), ...)`. Mirror that pattern for `requests`.
- The request document has `createdAt` and `expiresAt` Timestamp fields. Convert both to `Date` with `.toDate()` the same way `listenToTrip` converts `startTime`.
- Return type should match `listenToTrip`: return the unsubscribe function that `onSnapshot` gives back.

**B. `cancelRequest(requestId)`**
- One line: call `updateDoc` to set `status: 'cancelled'` on `doc(db, 'requests', requestId)`.
- Look at `updateTripStatus` for the `updateDoc` call pattern.
- Return type: `Promise<void>`.

**C. `getTripByRequestId(requestId)`**
- This is a one-shot query (not a listener). Use `getDocs` with a `query` and a `where` clause.
- `getDocs` is NOT currently imported at the top of `firestore.ts`. You need to add it to the existing import from `'firebase/firestore'`.
- The query shape: `query(collection(db, 'trips'), where('requestId', '==', requestId))`.
- If the snapshot is empty, return `null`. Otherwise return the first doc as a `Trip` object (same shape as `listenToTrip` builds it).
- Return type: `Promise<Trip | null>`.

**Before you write anything, ask yourself:**
- What does `onSnapshot` return? (Hint: it returns an unsubscribe function — that is what callers use to stop listening.)
- What is the difference between `getDocs` and `onSnapshot`? When would you use each?

**Checkpoint — how to verify Step 1 works:**
- TypeScript should compile without errors: run `npx tsc --noEmit` in the terminal.
- You can add a temporary `console.log` call inside `listenToRequest`'s callback in a screen, submit a request, and confirm the log fires with the request data. Remove the log afterward.

---

### Step 2: Create `useWatchRequest` Hook

**File to create**: `hooks/use-watch-request.ts`

**What you will learn**: How to wrap a Firestore real-time listener inside a React hook, and how to handle the case where the input (`requestId`) can be `null`.

**Study first**: Open `hooks/use-active-trip.ts`. That hook does almost exactly the same thing:
- It accepts an ID that can be `null`.
- It returns early if the ID is null (sets loading to false and returns `undefined` from the effect).
- It calls a `listen*` function and stores the result in state.
- It returns the unsubscribe function from the `useEffect` cleanup.

The key difference: `useActiveTrip` calls `listenToTrip`. Your hook will call `listenToRequest`.

**Signature to implement:**
```typescript
export function useWatchRequest(requestId: string | null) {
  // Returns { request: Request | null, loading: boolean }
}
```

**Guidance:**
- Keep the `loading` state: start it at `true`, set it to `false` inside the callback.
- The `useEffect` dependency array should contain `[requestId]` so the listener restarts whenever the ID changes.
- When `requestId` is `null`: set `loading = false` and return (do not start a listener).
- Import `listenToRequest` from `'@/services/firebase/firestore'`.
- Import `Request` from `'@/types/models'`.

**Checkpoint — how to verify Step 2 works:**
- TypeScript compilation (`npx tsc --noEmit`) passes.
- Temporarily import and call `useWatchRequest` with a hardcoded request ID from a recent Firestore document, log the result, and confirm the status appears. Remove the test after.

---

### Step 3: Create `useCommuterTrip` Hook

**File to create**: `hooks/use-commuter-trip.ts`

**What you will learn**: How to fetch data from two different Firestore collections in parallel after a real-time listener fires. This is the same pattern `useActiveTrip` uses, but fetching from `users/` and `drivers/` instead of `requests/`.

**Study first**: Open `hooks/use-active-trip.ts` again. Notice:
- It uses a `useRef(false)` called `commuterFetchedRef` to make sure it only fetches the commuter details once (not on every status update).
- Inside the listener callback it checks `!commuterFetchedRef.current` before fetching.
- It uses `await getRequestById(...)` to get commuter info from the request document.

Your hook is the mirror of this, but the driver info lives in two documents:
- `users/{driverId}` — has `name` and `phone`
- `drivers/{driverId}` — has `vehicleInfo` (a `VehicleInfo` object)

**Signature to implement:**
```typescript
export function useCommuterTrip(tripId: string | null) {
  // Returns { trip, driverName, driverPhone, driverVehicle, loading, error }
}
```

**Guidance:**
- Use `listenToTrip(tripId, callback)` — it is already in `firestore.ts` and already handles Timestamp conversion.
- To fetch from `users/` and `drivers/` directly, import `db` from `'@/services/firebase/config'` and use `getDoc` + `doc` from `'firebase/firestore'` directly in the hook. Look at how `useActiveTrip` imports `getRequestById` — you are doing something similar but inline.
- Fetch both documents in parallel: `const [userSnap, driverSnap] = await Promise.all([...])`.
- Use the `driverFetchedRef` guard the same way `useActiveTrip` uses `commuterFetchedRef`.
- `driverVehicle` is of type `VehicleInfo | null`.

**Question to answer before coding:**
- Why do we use `useRef(false)` instead of a regular `useState(false)` for the "fetched" flag? (Hint: what happens to the component if you use state here?)

**Checkpoint — how to verify Step 3 works:**
- TypeScript passes.
- Temporarily use the hook in a screen with a known trip ID. Log `driverName` and `driverVehicle`. Confirm both appear after a moment. Remove the test.

---

### Step 4: Create `FindingDriverModal` Component

**File to create**: `components/FindingDriverModal.tsx`

**What you will learn**: How to build a full-screen modal with an animated loading indicator, and how to react to real-time Firestore data changes inside a component.

**Study first**: Open `components/RequestPopup.tsx`. That component:
- Uses `Modal` with `animationType="slide"` and `presentationStyle="pageSheet"`.
- Has a useEffect that runs on visible/data changes.

**Props interface:**
```typescript
interface FindingDriverModalProps {
  visible: boolean;
  requestId: string | null;
  onDriverFound: (tripId: string) => void;
  onCancel: () => void;
}
```

**Build it in sub-parts:**

**Part A — Static layout first (no animation, no Firestore):**
- `Modal` with `animationType="slide"` and `presentationStyle="pageSheet"`.
- A header row with title "Finding Driver", subtitle "Searching for available drivers...", and an X close button top-right that calls `onCancel()`.
- A center content area with an `ActivityIndicator` (size="large", color="#1565C0") centered on a light-blue circle (100px diameter, `#E3F2FD` background).
- Bold headline text: "Finding the Best Available Driver".
- Body text: "We're matching you with a qualified driver near your location. This usually takes a few seconds."
- Three dots (just three `Text` components showing "." for now).
- A "Cancel Request" button at the bottom.

Get this rendering correctly before adding animation or Firestore logic.

**Part B — Three-dot animation:**
- Create three `Animated.Value` refs, all starting at `0`.
- In a `useEffect` that depends on `visible`, start an `Animated.loop` containing a `Animated.sequence`. The sequence pulses each dot's opacity in turn (use `Animated.timing` with delays: dot 1 at 0ms, dot 2 at 200ms, dot 3 at 400ms). Each timing goes to opacity 1 then back to 0 over 1200ms total loop duration.
- Return the stop cleanup from the effect.
- Render the dots as `<Animated.Text style={{ opacity: dot1Anim }}>.</Animated.Text>`.

**Part C — Firestore reaction:**
- Call `useWatchRequest(requestId)` inside the component. This gives you `{ request, loading }`.
- Add a `useEffect` that watches `request?.status`. When it equals `'accepted'`:
  - Call `getTripByRequestId(requestId!)` to find the trip document.
  - If the trip exists, call `onDriverFound(trip.id)`.
  - If it returns null (brief lag), wait 1 second and try once more. If it still fails, show an `Alert` and call `onCancel()`.
- Handle the edge case from the spec: if `request?.status === 'cancelled'` (driver-side cancellation), show an `Alert` and call `onCancel()` automatically.

**X button vs "Cancel Request" button distinction (important):**
- The X button in the header: calls `onCancel()` only. Does NOT write anything to Firestore. The request stays in 'searching' state.
- The "Cancel Request" button at the bottom: calls `cancelRequest(requestId!)` first, then `onCancel()`. This updates Firestore.

**Checkpoint — how to verify Step 4 works:**
- Run the app. Submit a request as a commuter. The modal should appear with the spinner and dots animating.
- Open the Firestore console and manually change `requests/{id}.status` to `'accepted'`. The modal should dismiss.
- Tap "Cancel Request". Check Firestore — the status should become `'cancelled'`.

---

### Step 5: Create `CommuterTripSheet` Component

**File to create**: `components/CommuterTripSheet.tsx`

**What you will learn**: How to build an expandable bottom sheet with a spring animation, display real-time trip data, and use a local `ProgressStep` sub-component. This mirrors the driver-side `ActiveTripSheet`.

**Study first**: Read all of `components/ActiveTripSheet.tsx`. Pay attention to:
- How `sheetHeight` is an `Animated.Value` initialized to `COLLAPSED_HEIGHT`.
- How `toggleSheet` animates it to `EXPANDED_HEIGHT` using `Animated.spring`.
- How `ProgressStep` is a local function (not exported) with its own `stepStyles`.
- How `ScrollView` has `scrollEnabled={isExpanded}`.
- The overall JSX structure: `Animated.View` > handle > content > `ScrollView` with expandable content.

**Props interface:**
```typescript
interface CommuterTripSheetProps {
  tripId: string;
  onTripCompleted: () => void;
}
```

**Height constants (different from ActiveTripSheet):**
```typescript
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.25;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.90;
```

**Build it in sub-parts:**

**Part A — Shell with correct heights:**
- Copy the `Animated.View` shell from `ActiveTripSheet` with `position: 'absolute', bottom: 0, left: 0, right: 0`.
- Add the drag handle and `toggleSheet` logic.
- Hard-code some placeholder text (driver name: "Test Driver") to verify the sheet appears and expands before wiring real data.

**Part B — Collapsed content:**
- Blue status banner: a row with a small animated blue dot (pulse: `Animated.loop` scaling between 0.8 and 1.2), the status text from `STATUS_BANNER_TEXT[trip?.status]`, and a "Live" badge on the right.
- Below the banner: large "8 min away" text. Add a `// TODO Sprint 4: Replace with live ETA` comment.
- Driver info row: 44px blue circle avatar with initials, driver name (bold), call button, message button.
- Initials formula: `driverName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '??'`

**Part C — `ProgressStep` sub-component:**
- Copy the `ProgressStep` function and `stepStyles` from `ActiveTripSheet.tsx` verbatim into this file (they are not exported — each file owns its own copy per the spec).
- Change the `dotActive` color from `'#34C759'` (green) to `'#1565C0'` (blue) to match the commuter-side design.

**Part D — Expanded content (inside `ScrollView`):**
- Vehicle card: a `View` with `flexDirection: 'row'` and two columns. Left: "Vehicle" label + `{year} {make} {model}`. Right: "License" label + `{licensePlate}`. Background `#F8F8F8`, rounded.
- Progress steps: define the `steps` array as shown in the spec and map them through `<ProgressStep>`.
- Safety banner: blue `#E3F2FD` box with an `Ionicons` `information-circle-outline` icon, "Safety First" in bold, and the body text.
- "Cancel Trip" button: red `#FF3B30`, full width. On press: `Alert.alert` with Confirm/Cancel. On confirm: call `updateTripStatus(tripId, 'cancelled')` from `firestore.ts`. The `useEffect` watching `trip?.status` will then fire `onTripCompleted()`.

**Part E — Trip completion effect:**
```typescript
useEffect(() => {
  if (trip?.status === 'completed') {
    onTripCompleted();
  }
}, [trip?.status]);
```

**Part F — Call/message buttons:**
```typescript
const handleCall = () => Linking.openURL(`tel:${driverPhone}`);
const handleSMS = () => Linking.openURL(`sms:${driverPhone}`);
```
Only render these when `driverPhone !== null`.

**Checkpoint — how to verify Step 5 works:**
- Temporarily render `<CommuterTripSheet tripId="some-real-id" onTripCompleted={() => {}} />` directly in `app/(commuter)/index.tsx` with a known trip ID from Firestore.
- The sheet should appear collapsed showing driver name and status.
- Tap the handle — it should spring open.
- Tap the handle again — it should spring back.
- Open Firestore console and change `trips/{id}.status` to `'arrived'` — first step should check off.
- Remove the temporary hardcoded render when done.

---

### Step 6: Wire `RequestServiceSheet` — Replace the Alert Stub

**File to edit**: `components/RequestServiceSheet.tsx`

**What you will learn**: How a child component communicates a result back to its parent via a callback prop. This is the standard React data-up pattern.

**Two changes:**

**Change 1 — Add the new prop to the interface (line 34-37):**
The existing interface is:
```typescript
interface RequestServiceSheetProps {
  visible: boolean;
  onClose: () => void;
}
```
Add one prop: `onRequestCreated: (requestId: string) => void`

Also update the function signature at line 110-113 to destructure the new prop.

**Change 2 — Replace the TODO stub (lines 244-259):**
Currently `createRequest(...)` is called but its return value is not captured. The return value is the new `requestId`. Capture it:
```typescript
const requestId = await createRequest(...all the same args...);
handleClose();
onRequestCreated(requestId);
```
Remove the two lines: `handleClose();` and `Alert.alert('Request Submitted!', ...)`.

Note that `handleClose()` is still called — just before `onRequestCreated` instead of after the Alert.

**Checkpoint:**
- TypeScript should compile without errors.
- The Alert no longer appears after submitting a request.
- The `onRequestCreated` callback fires (you can verify with a temporary `console.log` in the parent before Step 7).

---

### Step 7: Wire `app/(commuter)/index.tsx` — Mount New Components

**File to edit**: `app/(commuter)/index.tsx`

**What you will learn**: How a parent screen orchestrates multiple child components by managing shared state and passing callbacks between them.

**Add three new state variables** near the top of `CommuterScreen`:
```typescript
const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
const [showFindingModal, setShowFindingModal] = useState(false);
const [activeTripId, setActiveTripId] = useState<string | null>(null);
```

**Update `<RequestServiceSheet />`** to pass the new prop:
```tsx
<RequestServiceSheet
  visible={showServiceSheet}
  onClose={() => setShowServiceSheet(false)}
  onRequestCreated={(requestId) => {
    setActiveRequestId(requestId);
    setShowFindingModal(true);
  }}
/>
```

**Add `<FindingDriverModal />`** below `RequestServiceSheet` in the JSX:
```tsx
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
```

**Add `<CommuterTripSheet />`** conditionally:
```tsx
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

**Hide the "Request Roadside Assistance" button** when a trip is active. Find the `TouchableOpacity` around line 97 that renders the request button and wrap it in:
```tsx
{!activeTripId && (
  <TouchableOpacity ...>...</TouchableOpacity>
)}
```

**Add the three import statements** at the top of the file for the new components.

**Checkpoint — full end-to-end test:**
1. Submit a request → `FindingDriverModal` appears with animation.
2. Open Firestore console, manually change `requests/{id}.status` to `'accepted'`, and create a matching trip document (see spec testing section for the trip document shape).
3. Modal dismisses, `CommuterTripSheet` appears collapsed.
4. Tap the drag handle — sheet expands.
5. Change the trip status to `'arrived'` in Firestore — first step checks off.
6. Change to `'in_progress'` — second step checks off.
7. Change to `'completed'` — sheet dismisses, home screen resets.

---

### Step 8: Manual End-to-End Test

**What you will verify:**

Run through all the scenarios listed in the spec's Testing Strategy section:

- Two-device test (preferred): one device as commuter, one as driver.
- Single-device test (Firestore console): manually change document fields to simulate driver actions.

**Edge cases to check:**
1. Tap the X button in `FindingDriverModal` — request stays in Firestore as `'searching'`, modal closes.
2. Tap "Cancel Request" — request becomes `'cancelled'` in Firestore.
3. With the `CommuterTripSheet` open, tap "Cancel Trip" — confirm dialog appears, then trip becomes `'cancelled'`.
4. Run `npx tsc --noEmit` — zero TypeScript errors.
5. Run `npm run lint` — zero lint errors.

---

## Notes

- `listenToTrip` is already in `firestore.ts` and already converts Timestamps — no changes needed to that function.
- `getDocs` is not currently imported in `firestore.ts` — it must be added to the `firebase/firestore` import line.
- `ProgressStep` is deliberately duplicated (not shared) between `ActiveTripSheet` and `CommuterTripSheet`. The two components serve different roles and will diverge over time.
- The ETA of "8 min away" is hardcoded for Sprint 3 MVP. Sprint 4 will add live driver location and real ETA calculation.
- Design reference images are in `.claude/design/screens/commuter_request_flow_3.png` (FindingDriverModal), `commuter_request_flow_4.png` (transition), and `commuter_request_flow_5.png` (CommuterTripSheet collapsed + expanded).

*Progress file created by: code-coach agent*
*Date: 2026-03-10*
*Story: TOW-16 — US-2.4: See Assigned Driver Details*
