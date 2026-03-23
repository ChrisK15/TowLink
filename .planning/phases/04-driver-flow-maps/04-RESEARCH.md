# Phase 4: Driver Flow & Maps - Research

**Researched:** 2026-03-21
**Domain:** React Native maps, expo-location, Google Directions API, Firestore real-time location tracking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Driver Navigation UX**
- D-01: In-app map directions using Google Directions API — route polyline drawn on the existing MapView plus a next-turn instruction banner/card at the top of the screen
- D-02: No voice guidance — driver reads instruction cards visually. Full turn-by-turn via Mapbox deferred
- D-03: "Open in Maps" button inside ActiveTripSheet near the pickup address — auto-detects Google Maps (if installed), falls back to Apple Maps. Single button, no chooser dialog
- D-04: GPS-to-step matching logic needed — match GPS position against Directions API route steps and advance instruction card
- D-05: Rerouting on wrong turn: re-call Directions API with driver's current position
- D-06: Testing via iOS Simulator GPX route simulation

**Live Location Tracking**
- D-07: Driver location updates every 5 seconds via `expo-location` `watchPositionAsync`
- D-08: Foreground tracking only — no background location permission
- D-09: Driver location written to `drivers/{uid}.currentLocation` in Firestore — commuter reads via listener on driver document

**Route & ETA Display (Commuter Side)**
- D-10: Stage-based route display — en_route: driver-to-pickup; in_progress: pickup-to-dropoff
- D-11: ETA re-fetched from Google Directions API every 30 seconds
- D-12: Route polyline rendered on the commuter's MapView

**Driver Cancel Behavior (DRVR-04)**
- D-13: Driver can cancel only during `en_route` status
- D-14: Cancel button shown only during en_route; confirmation dialog required
- D-15: On cancel: trip → cancelled, request → searching, dispatch Cloud Function re-assigns

### Claude's Discretion
- Instruction card UI design (size, position, animation on step change)
- Route polyline color and styling — **UI-SPEC has decided these**: driver #34C759, commuter #1565C0, strokeWidth 4
- Exact GPS-to-step matching threshold — **UI-SPEC recommends 30m advance, 150m reroute**
- How to handle location permission denial gracefully — **UI-SPEC specifies Alert with "Open Settings"**
- Whether to animate the driver marker smoothly — **UI-SPEC recommends Animated.timing 250ms**
- Directions API error handling and retry logic

### Deferred Ideas (OUT OF SCOPE)
- Mapbox Navigation SDK for full turn-by-turn with voice guidance
- Background location tracking
- Commuter cancel during active trip (COMM-01, v2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRVR-01 | Driver can accept or decline an assigned job | Already functional via `RequestPopup` + `acceptClaimedRequest` / `declineClaimedRequest` — no new work needed; verify testID exists |
| DRVR-02 | Driver can navigate to commuter location using map directions during active trip | Google Directions API call → decode polyline → render on MapView + InstructionCard; `watchPositionAsync` for live position |
| DRVR-03 | Driver can advance trip status through all stages (en_route → arrived → in_progress → completed) | Already works via `handleStatusUpdate` in `ActiveTripSheet`; need to verify with live testing and add cancel guard |
| DRVR-04 | Driver can cancel an accepted job before the trip starts | New: CancelJobButton in `ActiveTripSheet` (en_route only) + `cancelTrip` Firestore call + Cloud Function re-dispatch |
| MAP-01 | Commuter sees real-time driver location on map during active trip | New hook listening to `drivers/{driverId}.currentLocation`; DriverMarker component on commuter MapView |
| MAP-02 | Route polyline and ETA shown on commuter map once a driver is assigned | Directions API call from commuter side; Polyline component; ETA in CommuterTripSheet replacing hardcoded "8 min away" |
| MAP-03 | Location permissions handled gracefully on iOS and Android | Improve existing permission flow; denial Alert with "Open Settings" (use `Linking.openSettings()` not `app-settings:`) |
</phase_requirements>

---

## Summary

Phase 4 adds three major new capabilities on top of a solid existing foundation: (1) live driver location tracking written to Firestore and displayed on the commuter's map, (2) Google Directions API integration for route polylines and turn-by-turn instruction cards on the driver's screen, and (3) the driver cancel flow with re-dispatch.

The core libraries (`react-native-maps`, `expo-location`, `firebase`) are already installed and in active use. The Directions API is the one genuinely new integration — it requires an HTTP fetch to Google's REST endpoint, response parsing, and encoded polyline decoding. No new npm packages are needed; Google's encoded polyline format can be decoded with a small utility function (about 20 lines) following the algorithm from Google's documentation.

The biggest risk area is the Directions API integration and GPS-to-step matching logic, both of which involve careful coordinate math and state management. The Firestore architecture for live location is straightforward: the driver writes to their own driver document every 5 seconds, and the commuter maintains a real-time listener on that document. The cancel-and-redispatch flow is the most architecturally sensitive: the Cloud Function already handles the `searching` status as a re-dispatch trigger, so the client-side work is setting `trip.status = 'cancelled'` and `request.status = 'searching'`, which will kick off the existing scheduler within 1 minute.

**Primary recommendation:** Break work into 4 parallel concerns — (A) live location tracking plumbing, (B) Directions API service layer, (C) driver screen InstructionCard + route display, (D) commuter screen DriverMarker + route + ETA. Cancel flow is a small addition to (C).

---

## Standard Stack

### Core (all already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-maps | 1.20.1 | MapView, Marker, Polyline | Already installed; Polyline and custom Marker children both supported |
| expo-location | ~19.0.8 | `watchPositionAsync`, `requestForegroundPermissionsAsync` | Already installed and in use on both screens |
| firebase (Firestore) | ^12.4.0 | Real-time location listener on driver document | Already the project's data layer |
| React Native Animated | built-in | InstructionCard fade, marker smooth move, ETA number change | No install needed |

### Google Directions API (new integration, no npm package)

| Service | Endpoint | Purpose |
|---------|---------|---------|
| Google Directions REST API | `https://maps.googleapis.com/maps/api/directions/json` | Fetch route steps, overview_polyline, duration |

The existing `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `app.config.js` already covers Maps SDK rendering. The **Directions API must be separately enabled** in Google Cloud Console under the same project — it is a different product from Maps SDK even if it uses the same API key. Verify at: Cloud Console → APIs & Services → Enabled APIs → look for "Directions API".

**No new npm packages needed for this phase.**

### Encoded Polyline Decoding

Google Directions API returns `overview_polyline.points` as a Google Encoded Polyline string. This must be decoded to `{latitude, longitude}[]` for `<Polyline coordinates={...}>`. The decode algorithm is a known 20-line pure JavaScript function — do NOT use an npm package for this; it is simple enough to implement inline.

```typescript
// Encoded polyline decode — no npm package needed
// Source: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const result: { latitude: number; longitude: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result_bits = 0, b: number;
    do { b = encoded.charCodeAt(index++) - 63; result_bits |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result_bits & 1) ? ~(result_bits >> 1) : (result_bits >> 1);
    shift = 0; result_bits = 0;
    do { b = encoded.charCodeAt(index++) - 63; result_bits |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result_bits & 1) ? ~(result_bits >> 1) : (result_bits >> 1);
    result.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return result;
}
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
services/
├── directions.ts         # Google Directions API fetch + decode (new)
hooks/
├── use-driver-location.ts  # Commuter side: listens to drivers/{uid}.currentLocation (new)
components/
├── InstructionCard.tsx   # Absolute-positioned overlay on driver MapView (new)
├── DriverMarker.tsx      # Custom MapView Marker for commuter screen (new)
```

The `ActiveTripSheet` and `CommuterTripSheet` get modified, not replaced.

### Pattern 1: Google Directions API Service

Create `services/directions.ts` as a pure async function. Keep it separate from `firestore.ts` — it is not Firebase.

```typescript
// Source: Google Directions API documentation
// https://developers.google.com/maps/documentation/directions/get-directions

export interface DirectionsResult {
  polylineCoords: { latitude: number; longitude: number }[];
  steps: RouteStep[];
  durationSeconds: number;
  durationText: string;    // "12 mins"
}

export interface RouteStep {
  instruction: string;     // HTML-stripped maneuver text
  maneuver: string;        // "turn-right", "turn-left", etc.
  startLocation: { latitude: number; longitude: number };
  distanceMeters: number;
  distanceText: string;    // "0.3 mi"
}

export async function fetchDirections(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  apiKey: string,
): Promise<DirectionsResult | null> {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.status !== 'OK' || !data.routes.length) return null;
  const route = data.routes[0];
  const leg = route.legs[0];
  return {
    polylineCoords: decodePolyline(route.overview_polyline.points),
    steps: leg.steps.map(parseStep),
    durationSeconds: leg.duration.value,
    durationText: leg.duration.text,
  };
}
```

HTML instruction stripping: `leg.steps[i].html_instructions` contains `<b>`, `<div>` tags. Strip with a simple regex: `instruction.replace(/<[^>]*>/g, ' ').trim()`.

### Pattern 2: Live Location Watcher (Driver Side)

```typescript
// In app/(driver)/index.tsx — start when activeTripId is set, stop when trip completes
useEffect(() => {
  if (!activeTripId || !user?.uid) return;
  let subscription: Location.LocationSubscription | null = null;

  (async () => {
    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.LocationAccuracy.BestForNavigation,
        timeInterval: 5000,   // ms — D-07
        distanceInterval: 5,  // meters — only emit if moved 5m+
      },
      (location) => {
        const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setDriverLocation(coords);
        // Write to Firestore — D-09
        updateDoc(doc(db, 'drivers', user.uid), { currentLocation: coords });
      }
    );
  })();

  return () => { subscription?.remove(); };
}, [activeTripId, user?.uid]);
```

**Important:** `watchPositionAsync` returns a Promise<LocationSubscription>. The cleanup must handle the async gap — store subscription in a ref initialized to null, and only call `.remove()` if it was assigned.

### Pattern 3: Live Location Listener (Commuter Side)

```typescript
// New hook: hooks/use-driver-location.ts
export function useDriverLocation(driverId: string | null) {
  const [driverLocation, setDriverLocation] = useState<{latitude:number;longitude:number}|null>(null);
  useEffect(() => {
    if (!driverId) return;
    const unsub = onSnapshot(doc(db, 'drivers', driverId), (snap) => {
      if (snap.exists()) {
        setDriverLocation(snap.data().currentLocation ?? null);
      }
    });
    return unsub;
  }, [driverId]);
  return driverLocation;
}
```

The `driverId` comes from `trip.driverId` — already available in `useCommuterTrip`.

### Pattern 4: Custom Marker with View Children

`react-native-maps` `<Marker>` accepts React Native `View` children to render a custom marker. The `tracksViewChanges={false}` prop is critical for performance once content is stable — without it, the map re-renders the marker every frame.

```typescript
// DriverMarker — commuter screen
<Marker coordinate={driverLocation} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#34C759',
                 borderWidth: 2, borderColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
    <Ionicons name="car" size={18} color="white" />
  </View>
</Marker>
```

### Pattern 5: Smooth Marker Animation Between Location Updates

`MapMarker` has a built-in `animateMarkerToCoordinate(coordinate, duration)` method via a ref. This is the cleanest approach for smooth movement.

```typescript
const driverMarkerRef = useRef<MapMarker>(null);

// When driverLocation changes:
useEffect(() => {
  if (driverLocation && driverMarkerRef.current) {
    driverMarkerRef.current.animateMarkerToCoordinate(driverLocation, 250);
  }
}, [driverLocation]);
```

### Pattern 6: GPS-to-Step Matching

```typescript
// D-04, UI-SPEC thresholds: advance at 30m, reroute at 150m
function findCurrentStep(
  driverLocation: { latitude: number; longitude: number },
  steps: RouteStep[],
  currentStepIndex: number,
): { stepIndex: number; shouldReroute: boolean } {
  if (currentStepIndex >= steps.length - 1) return { stepIndex: currentStepIndex, shouldReroute: false };

  const nextStep = steps[currentStepIndex + 1];
  const distToNextKm = getDistanceInKm(driverLocation, nextStep.startLocation);
  const distToCurrentKm = getDistanceInKm(driverLocation, steps[currentStepIndex].startLocation);

  if (distToNextKm * 1000 < 30) {
    // Within 30m of next step — advance
    return { stepIndex: currentStepIndex + 1, shouldReroute: false };
  }
  if (distToCurrentKm * 1000 > 150) {
    // More than 150m from current step start — off route
    return { stepIndex: currentStepIndex, shouldReroute: true };
  }
  return { stepIndex: currentStepIndex, shouldReroute: false };
}
```

### Pattern 7: Open in Maps (D-03)

```typescript
async function handleOpenInMaps(address: string, coords: { latitude: number; longitude: number }) {
  const googleMapsUrl = `comgooglemaps://?daddr=${coords.latitude},${coords.longitude}`;
  const appleMapsUrl = `maps://?daddr=${coords.latitude},${coords.longitude}`;
  const googleWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;

  const canOpenGoogle = await Linking.canOpenURL(googleMapsUrl);
  if (canOpenGoogle) {
    await Linking.openURL(googleMapsUrl);
  } else {
    // Apple Maps always available on iOS; on Android, fall back to web
    const canOpenApple = await Linking.canOpenURL(appleMapsUrl);
    await Linking.openURL(canOpenApple ? appleMapsUrl : googleWebUrl);
  }
}
```

### Pattern 8: Driver Cancel → Re-dispatch (D-14, D-15)

The cancel flow requires two Firestore writes in sequence:

1. Update `trips/{tripId}` → `status: 'cancelled'`
2. Update `requests/{requestId}` → `status: 'searching'` (clears claimedByDriverId, claimExpiresAt)

The Cloud Function `handleClaimTimeouts` runs every minute and picks up any request with `status: 'searching'` and a non-empty `notifiedDriverIds`. This triggers re-dispatch automatically. No new Cloud Function is needed.

**Critical:** The `requests` document's `requestId` is available from the `trip.requestId` field. The driver screen has `trip` from `useActiveTrip(activeTripId)`.

```typescript
async function handleCancelJob() {
  if (!trip) return;
  // 1. Mark trip cancelled
  await updateTripStatus(trip.id, 'cancelled');
  // 2. Reset request to searching so Cloud Function re-dispatches
  await updateDoc(doc(db, 'requests', trip.requestId), {
    status: 'searching',
    claimedByDriverId: null,
    claimExpiresAt: null,
  });
  // Driver availability is reset in the existing useEffect that watches trip.status
}
```

### Pattern 9: ETA Throttled Refetch (D-11)

```typescript
// On commuter screen — re-fetch every 30 seconds, not on every driver location update
useEffect(() => {
  if (!trip || trip.status !== 'en_route' || !driverLocation) return;
  fetchAndSetETA(); // initial fetch
  const interval = setInterval(fetchAndSetETA, 30_000);
  return () => clearInterval(interval);
}, [trip?.status, driverLocation]);
```

When `trip.status` advances to `in_progress`, the interval clears automatically and a new one starts for the pickup-to-dropoff route.

### Anti-Patterns to Avoid

- **Calling Directions API on every 5s location update:** Creates unnecessary API load and UI jank. Use the 30s interval for ETA (D-11) and only re-call on explicit reroute trigger.
- **Using `Linking.openURL('app-settings:')` for settings navigation:** The existing codebase uses `Linking.openSettings()` (from React Native's `Linking`). Use that — it works on both iOS and Android. The UI-SPEC mentions `app-settings:` but the driver screen already establishes `Linking.openSettings()` as the pattern.
- **Storing decoded polyline in Firestore:** Keep decoded route coords in component/hook state only — they are ephemeral navigation aids, not persistent data.
- **Forgetting `tracksViewChanges={false}` on custom Markers:** Without this, custom marker views cause continuous re-renders on iOS, degrading map performance significantly.
- **Calling `watchPositionAsync` without try/catch:** If location permission is revoked mid-trip, the promise rejects. Wrap in try/catch and handle gracefully per MAP-03.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route rendering on map | Custom canvas/SVG path | `<Polyline>` from react-native-maps | Already installed; handles projection, zoom scaling |
| Custom marker icons | Image assets | `<Marker>` with View children + Ionicons | Already installed; supports animated coordinate |
| Smooth marker movement | Manually interpolating coordinates | `marker.animateMarkerToCoordinate()` | Built-in to react-native-maps MapMarker |
| Distance calculation | Haversine implementation | `getDistanceInKm()` from `services/geoLocationUtils.ts` | Already exists in the project |
| Geocoding/geohashing | Custom geo math | `geofire-common` already installed | Already used in the project |
| Encoded polyline decode | npm package (`@mapbox/polyline`, etc.) | Inline 20-line decode function | Algorithm is 20 lines; no package needed |

**Key insight:** Every library this phase needs is already installed. The only "new" thing is the Google Directions API HTTP call and the polyline decode utility.

---

## Common Pitfalls

### Pitfall 1: Directions API Key Not Enabled for Directions Service

**What goes wrong:** `fetch()` to `maps.googleapis.com/maps/api/directions/json` returns `REQUEST_DENIED` even though the Maps SDK key works.

**Why it happens:** Google Cloud Console has separate API products. The Maps SDK for iOS/Android is different from the Directions API (web service). A key can have the Maps SDK enabled but not the Directions API.

**How to avoid:** Before implementing, verify in Cloud Console: APIs & Services → Enabled APIs. If "Directions API" is not listed, enable it. If the key has API restrictions, add Directions API to the allowed list.

**Warning signs:** Response `data.status === 'REQUEST_DENIED'` in the fetch callback.

### Pitfall 2: watchPositionAsync Async Cleanup Race

**What goes wrong:** Component unmounts before `watchPositionAsync` Promise resolves, causing the subscription's `.remove()` to never be called — location watcher keeps running.

**Why it happens:** `watchPositionAsync` returns a Promise, not the subscription directly. The `useEffect` cleanup runs synchronously, before the Promise resolves.

**How to avoid:** Use a `cancelled` flag pattern:

```typescript
useEffect(() => {
  let cancelled = false;
  let subscription: Location.LocationSubscription | null = null;
  (async () => {
    subscription = await Location.watchPositionAsync(options, callback);
    if (cancelled) subscription.remove(); // handle race
  })();
  return () => { cancelled = true; subscription?.remove(); };
}, [deps]);
```

**Warning signs:** Console warnings about state updates on unmounted components; location icon still active in status bar after leaving the screen.

### Pitfall 3: Marker Children Cause Continuous Re-renders

**What goes wrong:** Custom `<Marker>` with View children causes the entire MapView to re-render continuously on iOS, creating choppy scrolling and battery drain.

**Why it happens:** react-native-maps default `tracksViewChanges={true}` causes the marker image to update every frame. When used with complex View children, this triggers continuous native re-renders.

**How to avoid:** Set `tracksViewChanges={false}` on the DriverMarker. Only set `true` temporarily if the marker's visual content changes (e.g., during animation setup).

**Warning signs:** Choppy map interaction; high CPU usage when driver marker is visible.

### Pitfall 4: Cancel Flow Re-dispatch Delay

**What goes wrong:** Driver cancels, commuter sees "Searching for driver..." for up to 60 seconds before re-dispatch (the Cloud Function scheduler runs every 1 minute).

**Why it happens:** `handleClaimTimeouts` Cloud Function is a scheduled function with a 1-minute interval. After the request status is reset to `searching`, the function picks it up in the next run.

**How to avoid:** This is by design and acceptable for v1. The commuter screen correctly shows the `FindingDriverModal` ("Searching...") which handles the wait gracefully. No fix needed — document it for the student.

**Warning signs:** Not a bug — expected behavior. Only a concern if the delay was 5+ minutes.

### Pitfall 5: Directions API CORS Errors (Not Applicable to React Native)

**What goes wrong in web:** Direct fetch from browser to Google Directions API hits CORS restrictions.

**Why it doesn't apply here:** React Native apps are not browser contexts — there is no CORS. Direct `fetch()` to `maps.googleapis.com` works fine from React Native. No proxy or Cloud Function needed.

**Warning signs:** Only a concern if the codebase is later ported to web.

### Pitfall 6: `onSnapshot` on driver document when no trip is active

**What goes wrong:** The commuter screen sets up a `onSnapshot` listener on `drivers/{driverId}` whenever a `trip` exists. If `driverId` becomes stale after trip completion, the listener reads null or old data.

**Why it happens:** `useCommuterTrip` fetches `driverId` from the trip document. After trip completion, `activeTripId` is cleared, which should unmount `CommuterTripSheet` and clean up the listener.

**How to avoid:** Ensure `use-driver-location.ts` unsubscribes on cleanup (the `return unsub` pattern above handles this). Only start the listener when `driverId` is non-null.

---

## Code Examples

### Verified Patterns from Existing Code

#### Current permission pattern (from `app/(driver)/index.tsx` lines 186-210)

```typescript
// EXISTING PATTERN — use this, not app-settings: URL
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') {
  Alert.alert(
    'Location Permission Required',
    'TowLink needs location access...',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
  return;
}
```

#### Polyline component (confirmed in react-native-maps 1.20.1 index.d.ts)

```typescript
import { Polyline } from 'react-native-maps';

// Driver screen — green route
<Polyline
  coordinates={routeCoords}  // { latitude, longitude }[]
  strokeColor="#34C759"
  strokeWidth={4}
/>

// Commuter screen — blue route
<Polyline
  coordinates={routeCoords}
  strokeColor="#1565C0"
  strokeWidth={4}
/>
```

#### Smooth marker coordinate update (confirmed in MapMarker.d.ts line 304)

```typescript
import { MapMarker } from 'react-native-maps';
const markerRef = useRef<MapMarker>(null);

// Called when new driver location arrives
markerRef.current?.animateMarkerToCoordinate(newLocation, 250);
```

#### Trip status update (existing `services/firebase/firestore.ts`)

```typescript
// All status transitions — already handles timestamps for each status
await updateTripStatus(tripId, 'cancelled');
// Then separately:
await updateDoc(doc(db, 'requests', trip.requestId), {
  status: 'searching',
  claimedByDriverId: null,
  claimExpiresAt: null,
});
```

#### watchPositionAsync options for navigation accuracy

```typescript
// LocationAccuracy.BestForNavigation = 6 (highest accuracy + sensor fusion)
await Location.watchPositionAsync(
  {
    accuracy: Location.LocationAccuracy.BestForNavigation,
    timeInterval: 5000,     // 5 seconds — D-07
    distanceInterval: 5,    // skip updates if moved < 5m
  },
  callback,
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Linking.openURL('app-settings:')` | `Linking.openSettings()` | React Native 0.65+ | Works cross-platform without platform detection |
| npm packages for polyline decode | Inline algorithm | Always | Algorithm is short; packages add dependency overhead |
| `tracksViewChanges` default true | `tracksViewChanges={false}` for stable markers | react-native-maps v0.28+ | Significant iOS performance improvement |
| Background location required | Foreground-only sufficient for v1 | Design decision | Simpler permission model; acceptable for v1 |

---

## Open Questions

1. **Directions API key activation status**
   - What we know: The existing `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is configured in `app.config.js` and works for Maps SDK rendering
   - What's unclear: Whether the Directions API (web service) is enabled in Cloud Console for that key
   - Recommendation: First task in Wave 1 — test with a direct fetch call and confirm `status: 'OK'` response. If not, student enables it in Cloud Console. This is a configuration step, not code.

2. **Trip document missing `requestId` field availability**
   - What we know: `acceptClaimedRequest` in `firestore.ts` sets `requestId` on the trip document (line 274). `Trip` interface includes `requestId: string`.
   - What's unclear: Whether existing seeded trips in the emulator have this field populated (the seed data creates a `test-request-claimed` but does not pre-create a trip).
   - Recommendation: The cancel flow needs `trip.requestId`. Verify it is present in the trip document created by `acceptClaimedRequest` — it is set atomically in the transaction, so it should always be there for trips created in Phase 2+.

3. **iOS Simulator GPX simulation for testing D-06**
   - What we know: iOS Simulator supports GPX file route simulation via Debug menu. A .gpx file with waypoints between the seed data addresses (LA area: 34.0522, -118.2437 to 34.0625, -118.241) would exercise the full navigation flow.
   - What's unclear: Whether a .gpx file needs to be included in the Xcode project or can be used standalone.
   - Recommendation: GPX files can be used standalone — load via Simulator menu (Features → Location → Custom Location, or use a .gpx file via Xcode's scheme editor). Create a simple 5-waypoint GPX between seed data pickup and dropoff coordinates.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`. This is a React Native / Expo project with no automated test framework installed (`package.json` has no Jest, no Detox, no testing libraries). Per the project memory, Maestro E2E was dropped (TEST-01 is partial).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — manual testing via Firebase emulators + iOS Simulator |
| Config file | n/a |
| Quick run command | `npm run emulators && npm run emulators:seed` then manual |
| Full suite command | Manual verification steps per success criteria |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Verification Method |
|--------|----------|-----------|---------------------|
| DRVR-01 | Accept/decline a job | Manual smoke | Seed emulator, login as driver, verify RequestPopup appears and accept/decline works |
| DRVR-02 | Map directions during active trip | Manual functional | Accept a seeded request; verify InstructionCard appears; GPX simulation for step advancement |
| DRVR-03 | Trip status advances en_route → arrived → in_progress → completed | Manual functional | Tap through all 3 action buttons; verify Firestore status changes in emulator |
| DRVR-04 | Driver cancel during en_route | Manual functional | Accept request, verify Cancel Job button visible; cancel and confirm; verify commuter sees FindingDriverModal again |
| MAP-01 | Driver marker on commuter map | Manual functional | Two-device (or two simulator instances) test; login both accounts with seeded trip |
| MAP-02 | Route polyline and ETA on commuter map | Manual functional | Same as MAP-01; verify blue polyline renders and ETA shows "N min away" |
| MAP-03 | Location permission denial graceful | Manual smoke | On iOS Simulator: Settings → Privacy → Location → deny for TowLink; reopen app; verify Alert appears and does not crash |

### Wave 0 Gaps

- [ ] `scripts/seed-emulator.js` — add a pre-accepted trip (`status: 'en_route'`) to the seed so commuter screen tests don't require manually accepting a request first
- [ ] GPX route file at `testing/la-route.gpx` for iOS Simulator simulation between seed data pickup/dropoff coordinates

*(No automated test framework to install — all validation is manual with emulator.)*

---

## Sources

### Primary (HIGH confidence)

- react-native-maps 1.20.1 type definitions (local: `node_modules/react-native-maps/lib/`) — Polyline props, Marker.animateMarkerToCoordinate, custom Marker children pattern
- expo-location 19.0.8 type definitions (local: `node_modules/expo-location/build/`) — watchPositionAsync signature, LocationAccuracy enum values
- Existing codebase (`app/(driver)/index.tsx`, `services/firebase/firestore.ts`, `hooks/use-active-trip.ts`) — established patterns, existing permission flow
- Google Directions API endpoint format: well-established REST API (stable since 2009)

### Secondary (MEDIUM confidence)

- Google Cloud Console API enablement requirement — standard Google Maps Platform behavior documented at developers.google.com
- `tracksViewChanges={false}` performance fix — widely documented in react-native-maps GitHub issues and React Native community resources

### Tertiary (LOW confidence)

- 1-minute re-dispatch delay after driver cancel — inferred from Cloud Function scheduler interval. Would need emulator test to confirm actual timing.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from installed package type definitions
- Architecture: HIGH — patterns derived from existing codebase code, not guessed
- Pitfalls: MEDIUM/HIGH — most verified from type definitions and codebase; API key pitfall from general Google Maps Platform knowledge

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (stable libraries; Google Directions API is highly stable)
