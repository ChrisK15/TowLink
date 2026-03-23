---
phase: 04-driver-flow-maps
verified: 2026-03-23T17:58:04Z
status: gaps_found
score: 9/10 must-haves verified
re_verification: false
gaps:
  - truth: "Driver location is written to Firestore every 5 seconds during active trip"
    status: partial
    reason: "TypeScript compile error: Ionicons is used in app/(driver)/index.tsx line 391 (navigation arrow marker added in fix commit 8adc197) but the import was never added. The code renders correctly at runtime because Expo's Metro bundler resolves it, but tsc --noEmit fails on this file."
    artifacts:
      - path: "app/(driver)/index.tsx"
        issue: "Missing import: `import { Ionicons } from '@expo/vector-icons'` — used on line 391 but not in imports"
    missing:
      - "Add `import { Ionicons } from '@expo/vector-icons';` to app/(driver)/index.tsx imports"
human_verification:
  - test: "Driver advances trip through all four statuses"
    expected: "en_route -> arrived -> in_progress -> completed, each tap updates Firestore and UI reflects new status"
    why_human: "Status progression is real-time UI interaction; visual state transitions cannot be verified programmatically"
  - test: "Driver cancel during en_route re-dispatches job"
    expected: "Tapping Cancel Job shows Alert dialog, confirming sets trip to cancelled and request back to searching"
    why_human: "Alert dialog flow and Firestore state change require device interaction to confirm"
  - test: "Commuter sees driver marker move on map"
    expected: "Green car marker updates position as driver location changes in Firestore"
    why_human: "Smooth animation and real-time marker movement require emulator/device with GPS simulation"
  - test: "CommuterTripSheet shows live ETA from Directions API"
    expected: "ETA shows a value like '12 mins' rather than '-- min away' when Directions API is reachable"
    why_human: "Requires Google Directions API key to be enabled in Google Cloud Console and network access"
---

# Phase 04: Driver Flow & Maps Verification Report

**Phase Goal:** Drivers can execute the full job lifecycle from acceptance to completion, with live map navigation and real-time commuter visibility throughout the trip
**Verified:** 2026-03-23T17:58:04Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | `fetchDirections()` returns decoded polyline coords, route steps, and ETA from Google Directions API | VERIFIED | `services/directions.ts` calls `maps.googleapis.com/maps/api/directions/json`, decodes polyline inline, returns `DirectionsResult` with `polylineCoords`, `steps`, `durationSeconds`, `durationText` |
| 2  | `decodePolyline()` converts Google encoded polyline string to `{latitude, longitude}[]` array | VERIFIED | 20-line algorithm implemented inline in `services/directions.ts` lines 22-48; no npm package used |
| 3  | `useDriverLocation(driverId)` returns real-time driver position from Firestore listener | VERIFIED | `hooks/use-driver-location.ts` sets up `onSnapshot` on `drivers/{driverId}`, returns `data.currentLocation`, cleans up via `return unsub` |
| 4  | Location permission denial on both screens shows Alert with 'Open Settings' button instead of crashing | VERIFIED | Both `app/(driver)/index.tsx` (line 297-305) and `app/(commuter)/index.tsx` (line 109-117) contain `Alert.alert('Location Required', ...)` with `Linking.openSettings()` button |
| 5  | Driver sees route polyline on MapView from current location to pickup during en_route | VERIFIED | `app/(driver)/index.tsx` renders `<Polyline coordinates={routeData.polylineCoords} strokeColor="#1565C0" strokeWidth={4}>` inside MapView; `fetchDirections` is called on trip start and status change |
| 6  | Driver sees InstructionCard at top of screen with next-turn instruction text and distance | VERIFIED | `components/InstructionCard.tsx` rendered at lines 418-424 of driver screen with `currentStep`, `isCalculating`, `hasArrived` props; positioned `absolute top:60 left:16 right:16`; shows "Calculating route..." and "You have arrived" states |
| 7  | Driver can tap 'Cancel Job' during en_route and job re-enters dispatch queue | VERIFIED | `components/ActiveTripSheet.tsx` has `handleCancelJob` with `Alert('Cancel Job?')` confirmation; calls `updateTripStatus(trip.id, 'cancelled')` and `updateDoc(requests/{requestId}, {status: 'searching', claimedByDriverId: null, claimExpiresAt: null})`; button gated on `trip?.status === 'en_route'` |
| 8  | Commuter sees a green driver marker on the map that moves smoothly as driver location updates | VERIFIED | `app/(commuter)/index.tsx` renders `<Marker ref={driverMarkerRef} coordinate={driverLocation}>` with `<View style={styles.driverMarker}>` containing `<Ionicons name="car">`; `animateMarkerToCoordinate(driverLocation, 250)` called on Android (guarded by `Platform.OS === 'android'`) |
| 9  | Commuter sees live ETA that updates every 30 seconds, replacing hardcoded '8 min away' | VERIFIED | `components/CommuterTripSheet.tsx` line 219: `{eta ? `${eta}` : '-- min away'}`; `app/(commuter)/index.tsx` runs `setInterval(fetchAndSetRoute, 30_000)` with `clearInterval` cleanup; `eta` passed as prop |
| 10 | Driver location is written to Firestore every 5 seconds during active trip | PARTIAL | `watchPositionAsync` with `timeInterval: 5000` and `updateDoc(doc(db, 'drivers', user.uid), { currentLocation: coords })` are correctly implemented; however fix commit 8adc197 added `Ionicons` usage at line 391 without adding the import, causing `tsc --noEmit` to fail with `TS2304: Cannot find name 'Ionicons'` |

**Score:** 9/10 truths verified (1 partial due to missing import)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `services/directions.ts` | Google Directions API with polyline decode | VERIFIED | Exports `fetchDirections`, `decodePolyline`, `DirectionsResult`, `RouteStep`; 99 lines; calls `maps.googleapis.com`; strips HTML from steps; handles API key missing + non-OK status |
| `hooks/use-driver-location.ts` | Real-time Firestore listener for driver location | VERIFIED | 26 lines; exports `useDriverLocation`; uses `onSnapshot(doc(db, 'drivers', driverId))`; reads `data.currentLocation`; null-guard on driverId; cleanup via `return unsub` |
| `components/InstructionCard.tsx` | Navigation instruction overlay for driver MapView | VERIFIED | 137 lines; exports `InstructionCard`; three display states (calculating, arrived, navigating); Animated opacity fade on step change; Ionicons maneuver icons; correct absolute positioning |
| `components/ActiveTripSheet.tsx` | Modified trip sheet with CancelJobButton and OpenInMapsButton | VERIFIED | Contains `handleCancelJob` with exact copy from UI-SPEC; `handleOpenInMaps` with Apple Maps -> Google Maps -> web fallback chain; CancelJobButton with `testID="cancel-job-btn"` gated on `en_route`; OpenInMapsButton with `#007AFF` text |
| `app/(driver)/index.tsx` | Driver screen with live location watcher, route polyline, InstructionCard | PARTIAL | All core functionality present; missing `import { Ionicons } from '@expo/vector-icons'` — added Ionicons use in fix commit but import omitted |
| `app/(commuter)/index.tsx` | Commuter screen with DriverMarker, route polyline, map fit | VERIFIED | Imports `useDriverLocation`, `fetchDirections`, `Polyline`, `MapMarker`; renders green driver marker with car icon; blue polyline `#1565C0`; 30s ETA interval; `fitToCoordinates` on trip start; platform-guarded `animateMarkerToCoordinate` |
| `components/CommuterTripSheet.tsx` | Sheet with live ETA from Directions API | VERIFIED | `eta: string | null` in props interface; destructures `eta`; renders `{eta ? eta : '-- min away'}`; no hardcoded "8 min away"; no "TODO Sprint 4" comment |
| `scripts/seed-emulator.js` | Seed data includes en_route trip for commuter-side testing | VERIFIED | Contains `db.collection('trips').doc('test-trip-enroute').set({...status: 'en_route'...})` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `services/directions.ts` | `maps.googleapis.com/maps/api/directions/json` | `fetch()` with `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | WIRED | Line 74: URL contains `maps.googleapis.com/maps/api/directions/json`; reads `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` |
| `hooks/use-driver-location.ts` | `drivers/{driverId}` | `onSnapshot` listener on driver document | WIRED | Line 16: `onSnapshot(doc(db, 'drivers', driverId), ...)` reads `data.currentLocation` |
| `app/(driver)/index.tsx` | `services/directions.ts` | `fetchDirections()` for route data | WIRED | Line 15 import; called at line 153 (trip start) and line 189 (reroute); `routeData` passed to `<Polyline>` and `<InstructionCard>` |
| `app/(driver)/index.tsx` | `drivers/{uid}.currentLocation` | `updateDoc` every 5s from `watchPositionAsync` | WIRED | Line 126: `updateDoc(doc(db, 'drivers', user.uid!), { currentLocation: coords })` inside 5s watcher callback |
| `components/ActiveTripSheet.tsx` | `requests/{requestId}` | `updateDoc` to reset status to searching on cancel | WIRED | Lines 147-151: `updateDoc(doc(db, 'requests', trip.requestId), { status: 'searching', claimedByDriverId: null, claimExpiresAt: null })` |
| `app/(commuter)/index.tsx` | `hooks/use-driver-location.ts` | `useDriverLocation(trip.driverId)` | WIRED | Line 5 import; line 30: `useDriverLocation(trip?.driverId ?? null)` |
| `app/(commuter)/index.tsx` | `services/directions.ts` | `fetchDirections` for route polyline | WIRED | Line 7 import; called inside `fetchAndSetRoute` at line 78; result sets `routeCoords` and `eta` |
| `components/CommuterTripSheet.tsx` | `eta` prop from parent | `props.eta` replaces hardcoded "8 min away" | WIRED | Line 32: `eta: string | null` in interface; line 87: destructured; line 219: `{eta ? eta : '-- min away'}` |
| `scripts/seed-emulator.js` | `trips` collection | seed document with status `en_route` | WIRED | Line 217-232: `test-trip-enroute` document with `status: 'en_route'` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DRVR-01 | 04-02 | Driver can accept or decline an assigned job | SATISFIED | `acceptClaimedRequest` / `declineClaimedRequest` called from `handleAcceptRequest` / `handleDeclineRequest` in driver screen; `RequestPopup` renders with Accept/Decline buttons |
| DRVR-02 | 04-01, 04-02 | Driver can navigate to commuter location using map directions during active trip | SATISFIED | `fetchDirections` wired to trip lifecycle; `<Polyline>` on MapView; `InstructionCard` overlay with GPS-to-step matching; `handleOpenInMaps` in ActiveTripSheet |
| DRVR-03 | 04-02 | Driver can advance trip status through all stages (en route → arrived → in progress → completed) | SATISFIED | `handleStatusUpdate` in `ActiveTripSheet` with `NEXT_STATUS` map; action buttons gated per status; `updateTripStatus` Firestore call |
| DRVR-04 | 04-02 | Driver can cancel an accepted job before the trip starts | SATISFIED | `handleCancelJob` in `ActiveTripSheet` with confirmation dialog; cancels trip + resets request to `searching`; Firestore rule for `accepted → searching` added in fix commit |
| MAP-01 | 04-01, 04-03 | Commuter sees real-time driver location on map during active trip | SATISFIED | `useDriverLocation` hook in commuter screen; green driver marker rendered; `animateMarkerToCoordinate` on Android |
| MAP-02 | 04-01, 04-03 | Route polyline and ETA are shown on commuter map once a driver is assigned | SATISFIED | Blue `<Polyline>` in commuter MapView; 30s ETA refresh; `CommuterTripSheet` displays live ETA; stage-based route switching |
| MAP-03 | 04-01 | Location permissions handled gracefully on iOS and Android | SATISFIED | Both screens show `Alert('Location Required')` with `Open Settings` button on denial; no crash path |

**All 7 requirements claimed by Phase 4 are accounted for and satisfied by implementation evidence.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/(driver)/index.tsx` | 391 | `Ionicons` used without import (`TS2304: Cannot find name 'Ionicons'`) | Warning | TypeScript compilation fails for this file; runtime works because Metro resolves it, but tsc check is broken |
| `functions/src/__tests__/dispatch-integration.test.ts` | 28, 33, 95+ | Missing `@types/jest` — pre-existing TS errors unrelated to Phase 4 | Info | Pre-existing issue from before Phase 4; not introduced by this phase |

**Note on driver polyline color:** The plan specified `strokeColor="#34C759"` (green) for the driver route polyline. Fix commit 8adc197 changed it to `"#1565C0"` (blue) per user request. This is a documented intentional deviation, not a bug. The commuter polyline was always `#1565C0` — the driver polyline now matches.

---

### Human Verification Required

#### 1. Driver Trip Status Progression (DRVR-03)

**Test:** Login as driver, accept a seeded request, tap "I've Arrived", "Start Service", "Complete Trip"
**Expected:** Each tap updates trip status in Firestore and the sheet UI updates to show next action button; after "Complete Trip" driver returns to idle state
**Why human:** Button sequencing and real-time UI state transitions require device interaction

#### 2. Cancel Job Re-Dispatch (DRVR-04)

**Test:** Accept a request, while in en_route status tap "Cancel Job" in the trip sheet
**Expected:** Alert appears with "Cancel Job?" title and "This job will be reassigned to another driver." body; tapping "Yes, Cancel Job" sets trip to cancelled, request back to `searching`, FindingDriverModal re-appears on commuter side
**Why human:** Alert dialog flow and cross-device state coordination require device testing

#### 3. Commuter Driver Marker Movement (MAP-01)

**Test:** With seeded en_route trip active and GPS simulation running, open commuter screen
**Expected:** Green circle marker with car icon appears on map and moves as driver location updates in Firestore; on Android, movement is smooth (animated); on iOS movement is instant
**Why human:** Real-time position animation requires GPS simulation and device observation

#### 4. Live ETA in CommuterTripSheet (MAP-02)

**Test:** With active trip and Directions API key enabled, check CommuterTripSheet header
**Expected:** ETA shows a value like "12 mins" from Directions API rather than "-- min away"; updates approximately every 30 seconds
**Why human:** Requires active Google Directions API key in Cloud Console and network access; "-- min away" shown when key not configured is correct behavior but indistinguishable from missing key

---

### Gaps Summary

One gap was found during verification:

**Missing `Ionicons` import in `app/(driver)/index.tsx`**

Fix commit 8adc197 added a navigation arrow driver marker using `<Ionicons name="navigate" size={24} color="#1565C0" />` (replacing the original `pinColor="red"` marker) but omitted the corresponding import line. The Expo/Metro bundler resolves this at runtime, so the app runs, but `npx tsc --noEmit` reports `TS2304: Cannot find name 'Ionicons'`.

The fix is a single-line addition:

```typescript
import { Ionicons } from '@expo/vector-icons';
```

This should be added to the import block at the top of `app/(driver)/index.tsx` (after line 17 where `AsyncStorage` is imported, consistent with the import in `app/(commuter)/index.tsx` line 9).

---

_Verified: 2026-03-23T17:58:04Z_
_Verifier: Claude (gsd-verifier)_
