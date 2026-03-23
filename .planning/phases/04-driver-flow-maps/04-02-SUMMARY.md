---
phase: 04-driver-flow-maps
plan: 02
subsystem: ui
tags: [react-native, maps, polyline, geolocation, firestore, navigation, expo-location]

# Dependency graph
requires:
  - phase: 04-driver-flow-maps plan 01
    provides: fetchDirections, DirectionsResult, RouteStep interfaces, geoLocationUtils.getDistanceInKm

provides:
  - InstructionCard component with animated step transitions
  - Route polyline on driver MapView (strokeColor #34C759)
  - Live location watcher writing to Firestore every 5s
  - GPS-to-step matching (30m advance, 150m reroute thresholds)
  - CancelJobButton in ActiveTripSheet (en_route only, with confirmation)
  - OpenInMapsButton in ActiveTripSheet (Google Maps / Apple Maps fallback)

affects: [driver-flow, active-trip, commuter-realtime]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Async cleanup race condition prevention using cancelled flag + subscription?.remove()"
    - "watchPositionAsync with timeInterval 5000 + distanceInterval 5 for balanced accuracy/battery"
    - "GPS-to-step matching: 30m threshold to advance, 150m threshold to reroute"
    - "fetchDirections called once on trip start and on status change (not every location update)"
    - "Animated.timing opacity fade for InstructionCard step transitions (100ms out + 100ms in)"

key-files:
  created:
    - components/InstructionCard.tsx
  modified:
    - app/(driver)/index.tsx
    - components/ActiveTripSheet.tsx

key-decisions:
  - "InstructionCard renders 'Calculating route...' when isCalculating=true, 'You have arrived' when hasArrived=true — clear visual feedback during both loading and arrival states"
  - "fetchDirections triggered on trip?.id and trip?.status deps only — avoids re-fetching on every 5s location tick"
  - "CancelJobButton only visible during en_route per D-13 — prevents accidental cancellation during other statuses"
  - "handleOpenInMaps prefers Google Maps app, falls back to Apple Maps app, then Google web — no user chooser dialog per D-03"

patterns-established:
  - "Pattern: Async subscription cleanup — use cancelled flag inside IIFE to guard against race between await and component unmount"
  - "Pattern: GPS-to-step matching reads next step's startLocation distance to decide advance vs current step's startLocation distance to decide reroute"

requirements-completed: [DRVR-01, DRVR-02, DRVR-03, DRVR-04]

# Metrics
duration: 8min
completed: 2026-03-21
---

# Phase 04 Plan 02: Driver Navigation and Trip Controls Summary

**InstructionCard with animated turn-by-turn directions, live Firestore location writes every 5s, route polyline on MapView, GPS step-matching, Cancel Job re-dispatch, and Open in Maps button**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-21T19:55:00Z
- **Completed:** 2026-03-21T20:03:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created InstructionCard overlay with animated fade transitions between steps, Ionicons turn indicators, and three display states (calculating, arrived, navigating)
- Wired live location watcher (watchPositionAsync 5s/5m) with cancelled-flag cleanup and Firestore writes to drivers/{uid}.currentLocation
- Added route polyline (#34C759, strokeWidth 4) inside MapView with GPS-to-step matching (30m advance, 150m reroute)
- Added CancelJobButton (en_route only) with Alert confirmation dialog that resets request to searching for re-dispatch
- Added OpenInMapsButton below pickup address with Google Maps / Apple Maps / web fallback chain

## Task Commits

Each task was committed atomically:

1. **Task 1: InstructionCard, route polyline, live location watcher** - `dd281e8` (feat)
2. **Task 2: CancelJobButton and OpenInMapsButton** - `ce3ef2c` (feat)

## Files Created/Modified
- `components/InstructionCard.tsx` - Navigation instruction overlay, animated fade, Ionicons maneuver icons, three display states
- `app/(driver)/index.tsx` - watchPositionAsync watcher, fetchDirections on trip start/status change, GPS-to-step matching, Polyline render, InstructionCard render
- `components/ActiveTripSheet.tsx` - handleCancelJob (Alert + Firestore writes), handleOpenInMaps (URL scheme chain), CancelJobButton JSX (en_route guard), OpenInMapsButton JSX, styles

## Decisions Made
- fetchDirections called only on trip?.id and trip?.status deps — not on driverLocation changes — prevents API rate limit abuse on every 5s location tick
- cancelled flag pattern for watchPositionAsync cleanup prevents state updates after unmount in async IIFE
- CancelJobButton hidden outside en_route status per plan D-13 spec

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `functions/src/__tests__/dispatch-integration.test.ts` (missing @types/jest) and `app/(commuter)/index.tsx` (eta prop) were present before this plan. No new errors introduced.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Driver navigation flow is fully wired: polyline, InstructionCard, step advancement, cancel/re-dispatch, and external nav handoff
- Plan 03 (commuter map ETA/polyline) and Plan 04 (integration/testing) can proceed
- All DRVR-01 through DRVR-04 requirements completed

## Self-Check: PASSED

All created files found on disk. All task commits verified in git history.

---
*Phase: 04-driver-flow-maps*
*Completed: 2026-03-21*
