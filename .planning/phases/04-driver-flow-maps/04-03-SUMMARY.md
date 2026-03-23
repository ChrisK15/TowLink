---
phase: 04-driver-flow-maps
plan: "03"
subsystem: commuter-map
tags: [maps, real-time, polyline, ETA, driver-tracking]
dependency_graph:
  requires: ["04-01"]
  provides: ["MAP-01", "MAP-02"]
  affects: ["app/(commuter)/index.tsx", "components/CommuterTripSheet.tsx"]
tech_stack:
  added: []
  patterns:
    - "animateMarkerToCoordinate for smooth driver marker movement (250ms)"
    - "Stage-based routing: driver->pickup during en_route/arrived, pickup->dropoff during in_progress"
    - "setInterval every 30s for ETA refresh, dependency on trip.status + !!driverLocation to avoid stale closures"
    - "tracksViewChanges=false on custom Marker children for performance"
key_files:
  created: []
  modified:
    - "app/(commuter)/index.tsx"
    - "components/CommuterTripSheet.tsx"
decisions:
  - "ETA displayed as-is from Directions API durationText (e.g. '12 mins') — already includes units suffix"
  - "Route useEffect depends on trip?.status and !!driverLocation (boolean) not driverLocation object — prevents re-establishing interval on every 5s location update"
  - "fitToCoordinates depends on trip?.id and !!driverLocation — fits once per trip, not on every location tick"
metrics:
  duration: "~5 min"
  completed: "2026-03-21"
  tasks: 2
  files: 2
---

# Phase 04 Plan 03: Commuter Driver Tracking and Live ETA Summary

**One-liner:** Live green driver marker with smooth animation, blue route polyline (#1565C0) switching on trip stage, and 30s ETA from Google Directions API replacing hardcoded "8 min away".

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add DriverMarker and route polyline to commuter map screen | b7358eb | app/(commuter)/index.tsx |
| 2 | Add live ETA to CommuterTripSheet replacing hardcoded "8 min away" | f9ddaeb | components/CommuterTripSheet.tsx |

## What Was Built

**app/(commuter)/index.tsx:**
- Added `useCommuterTrip`, `useDriverLocation`, `fetchDirections` hooks/services
- Green driver marker (32x32px, #34C759, border 2px white, Ionicons "car" icon) with `tracksViewChanges={false}` for performance
- `animateMarkerToCoordinate` with 250ms duration for smooth position updates
- Blue `<Polyline>` (strokeColor="#1565C0", strokeWidth=4) from Directions API coords
- Stage-based route logic: driver→pickup during en_route/arrived, pickup→dropoff during in_progress
- 30-second `setInterval` for ETA refresh; interval restarts only when `trip.status` changes or driver first becomes available
- `fitToCoordinates` to keep driver and destination visible in map viewport
- `eta` state passed down to `CommuterTripSheet` as prop

**components/CommuterTripSheet.tsx:**
- Extended `CommuterTripSheetProps` with `eta: string | null`
- Destructures `eta` from props
- Replaced hardcoded `"8 min away"` with `{eta ? eta : '-- min away'}`
- Removed TODO Sprint 4 comment

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All functionality is wired to live data:
- Driver marker position: `useDriverLocation` subscribes to Firestore `drivers/{driverId}` in real-time
- Route polyline: `fetchDirections` calls Google Directions API
- ETA: `result.durationText` from Directions API response, refreshed every 30s

## Self-Check: PASSED
