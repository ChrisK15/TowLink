# Phase 4: Driver Flow & Maps - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Drivers execute the full job lifecycle from acceptance to completion, with in-app map navigation (route polyline + instruction cards) and real-time commuter visibility throughout the trip. Commuters see the driver's live location on the map with a route polyline and updating ETA. Location permissions handled gracefully on both platforms. Push notifications (Phase 5), Firestore security rules (Phase 6), and payments (v2) are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Driver Navigation UX
- **D-01:** In-app map directions using Google Directions API — route polyline drawn on the existing MapView plus a next-turn instruction banner/card at the top of the screen
- **D-02:** No voice guidance — driver reads instruction cards visually (like early GPS). Full turn-by-turn via Mapbox deferred as a potential future enhancement
- **D-03:** "Open in Maps" button inside ActiveTripSheet near the pickup address — auto-detects Google Maps (if installed), falls back to Apple Maps. Single button, no chooser dialog
- **D-04:** GPS-to-step matching logic needed — as driver moves, match GPS position against Directions API route steps and advance the instruction card to the next maneuver
- **D-05:** Rerouting on wrong turn: re-call Directions API with driver's current position to get a new route
- **D-06:** Testing via iOS Simulator GPX route simulation — create .gpx file with known route between seed data addresses, no physical driving needed

### Live Location Tracking
- **D-07:** Driver location updates every 5 seconds during active trip via `expo-location` `watchPositionAsync`
- **D-08:** Foreground tracking only — no background location permission required. If driver backgrounds the app, tracking pauses
- **D-09:** Driver location written to `drivers/{uid}.currentLocation` in Firestore — commuter reads this via a listener on the driver document (driverId comes from the trip)

### Route & ETA Display (Commuter Side)
- **D-10:** Stage-based route display — during `en_route`: show driver-to-pickup route + ETA. During `in_progress`: show pickup-to-dropoff route. Route switches automatically when trip status advances
- **D-11:** ETA re-fetched from Google Directions API every 30 seconds (throttled, not on every 5s location update). Replaces the hardcoded "8 min away" in CommuterTripSheet
- **D-12:** Route polyline rendered on the commuter's MapView alongside the driver's live marker

### Driver Cancel Behavior (DRVR-04)
- **D-13:** Driver can cancel only during `en_route` status — once they tap "I've Arrived" they are committed
- **D-14:** Cancel button: red "Cancel Job" button at the bottom of ActiveTripSheet, shown only during `en_route`. Confirmation dialog: "Are you sure? This job will be reassigned to another driver."
- **D-15:** On cancel: trip status set to `cancelled`, request status reset to `searching`, dispatch Cloud Function re-assigns to the next available driver in the same company. Commuter sees "Searching for driver..." again (reuses existing FindingDriverModal flow)

### Claude's Discretion
- Instruction card UI design (size, position, animation on step change)
- Route polyline color and styling (driver vs commuter views)
- Exact GPS-to-step matching threshold (distance in meters before advancing)
- How to handle location permission denial gracefully (existing code has basic Alert — may improve)
- Whether to animate the driver marker smoothly between location updates or jump
- Directions API error handling and retry logic

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — DRVR-01, DRVR-02, DRVR-03, DRVR-04, MAP-01, MAP-02, MAP-03 define all acceptance criteria
- `.planning/ROADMAP.md` §Phase 4 — Success criteria (6 items) that must all be true for phase completion

### Prior Phase Context
- `.planning/phases/01-companies-admin/01-CONTEXT.md` — Company data model, admin role, driver-company linkage
- `.planning/phases/02-company-based-dispatch/02-CONTEXT.md` — Dispatch flow, company routing, fair distribution, request/trip lifecycle, re-dispatch on decline
- `.planning/phases/03-maestro-e2e-testing/03-CONTEXT.md` — Firebase emulator setup, seed data patterns, testID conventions

### No external specs
No ADRs or design docs. Requirements captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ActiveTripSheet.tsx` — Driver's trip sheet with status progression (en_route → arrived → in_progress → completed), action buttons, commuter contact. Needs: cancel button during en_route, "Open in Maps" button, instruction card integration
- `components/CommuterTripSheet.tsx` — Commuter's trip sheet with progress steps, driver info, vehicle card, pulsing status dot. Needs: replace hardcoded "8 min away" with live ETA, add route polyline to map
- `components/RequestPopup.tsx` — Driver accept/decline popup for incoming requests. Already functional (DRVR-01)
- `components/FindingDriverModal.tsx` — Commuter "Searching for driver..." modal. Will be reused when driver cancels and job re-enters dispatch
- `hooks/use-active-trip.ts` — Listens to trip document, fetches commuter name/phone. Used by driver screen
- `hooks/use-commuter-trip.ts` — Listens to trip document, fetches driver name/phone/vehicle. Used by commuter screen
- `services/firebase/firestore.ts` — `updateTripStatus()`, `acceptClaimedRequest()`, `declineClaimedRequest()` all exist
- `services/geoLocationUtils.ts` — `getGeohash()`, `getDistanceInKm()` available for distance calculations
- `react-native-maps` — MapView with Marker already used on both driver and commuter screens. Supports Polyline component for route rendering

### Established Patterns
- Trip status updates via `updateTripStatus(tripId, newStatus)` — single function for all transitions
- Firestore real-time listeners wrapped in custom hooks (`use-active-trip`, `use-commuter-trip`)
- Location permissions requested via `expo-location` `requestForegroundPermissionsAsync()` with Alert fallback to Settings
- Bottom sheet pattern: custom Animated.View with drag handle (ActiveTripSheet, CommuterTripSheet)
- Driver availability toggle: `updateDriverAvailability(uid, isAvailable, location)`

### Integration Points
- `app/(driver)/index.tsx` — Main driver screen. Add: location watcher during active trip, instruction card overlay, route polyline on MapView, cancel button in ActiveTripSheet
- `app/(commuter)/index.tsx` — Main commuter screen. Add: driver location marker on MapView, route polyline, live ETA in CommuterTripSheet
- `drivers/{uid}.currentLocation` — Existing field, will be updated every 5s during active trip
- `functions/src/index.ts` — Dispatch Cloud Functions. Cancel flow needs to reset request to `searching` status to trigger re-dispatch
- Google Directions API — New integration (HTTP call to `maps.googleapis.com/maps/api/directions/json`). Existing Google Maps API key may need Directions API enabled in Cloud Console

</code_context>

<specifics>
## Specific Ideas

- GPX file simulation for testing driver navigation without physical driving — create .gpx routes between seed data locations, play in iOS Simulator
- Driver instruction card should feel like a simplified GPS nav screen — next turn instruction prominent at top, not buried in the sheet
- Commuter ETA should update smoothly, not jump — consider animating the number change
- "Open in Maps" button auto-detects Google Maps availability, falls back to Apple Maps — single tap, no chooser

</specifics>

<deferred>
## Deferred Ideas

- Mapbox Navigation SDK for full turn-by-turn with voice guidance — researched, viable free tier exists for low usage, but requires replacing Google Maps stack. Consider for v2
- Background location tracking — requires "Always Allow" permission, background task config, significantly more complex. Foreground-only sufficient for v1
- Commuter cancel during active trip — CommuterTripSheet has a cancel button but it's not part of Phase 4 requirements (COMM-01 is v2)

</deferred>

---

*Phase: 04-driver-flow-maps*
*Context gathered: 2026-03-21*
