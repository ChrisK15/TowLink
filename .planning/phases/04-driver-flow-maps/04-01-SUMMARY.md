---
phase: 04-driver-flow-maps
plan: 01
subsystem: services
tags: [directions-api, firestore, location, maps, permissions]
dependency_graph:
  requires: []
  provides:
    - services/directions.ts (fetchDirections, decodePolyline, DirectionsResult, RouteStep)
    - hooks/use-driver-location.ts (useDriverLocation)
  affects:
    - app/(driver)/index.tsx
    - app/(commuter)/index.tsx
tech_stack:
  added: []
  patterns:
    - Google Directions API HTTP fetch with encoded polyline decode (no npm package)
    - Firestore onSnapshot listener hook with null-guard and cleanup
    - Alert with Open Settings button for location permission denial (Linking.openSettings)
key_files:
  created:
    - services/directions.ts
    - hooks/use-driver-location.ts
  modified:
    - app/(driver)/index.tsx
    - app/(commuter)/index.tsx
decisions:
  - fetchDirections reads EXPO_PUBLIC_GOOGLE_MAPS_API_KEY from process.env directly (not passed as param) — simpler call site for driver and commuter screens
  - decodePolyline implemented inline (20 lines) instead of npm package — algorithm is short, no dependency overhead
key_decisions:
  - fetchDirections reads EXPO_PUBLIC_GOOGLE_MAPS_API_KEY from process.env directly
  - decodePolyline implemented inline without npm package
metrics:
  duration: 103s
  completed: "2026-03-21T19:50:33Z"
  tasks: 2
  files: 4
requirements: [DRVR-02, MAP-01, MAP-03]
---

# Phase 04 Plan 01: Service Layer and Location Permission UX Summary

Google Directions API service with inline polyline decode plus real-time Firestore driver location hook, with improved location permission UX on both screens.

## What Was Built

**Task 1: services/directions.ts**
- `fetchDirections(origin, destination)` — fetches from `https://maps.googleapis.com/maps/api/directions/json`, decodes overview polyline, parses steps, returns `DirectionsResult | null`
- `decodePolyline(encoded)` — implements Google Encoded Polyline Algorithm inline (no npm package); returns `{ latitude, longitude }[]`
- `parseStep()` — strips HTML tags from `html_instructions` with `/<[^>]*>/g` regex
- Graceful error handling: missing API key warns, fetch errors caught and return null, non-OK status warns with status code

**Task 2: hooks/use-driver-location.ts + permission UX**
- `useDriverLocation(driverId)` — sets up `onSnapshot` listener on `drivers/{driverId}`, returns `data.currentLocation` or null; cleans up via `return unsub`
- `app/(driver)/index.tsx` — updated `getUserLocation` Alert title from 'Location Permission Required' to 'Location Required' with plan-specified copy
- `app/(commuter)/index.tsx` — replaced bare `Alert.alert('Permission denied, location access needed')` with full Alert with 'Location Required' title, descriptive message, and 'Open Settings' button; added `Linking` to react-native imports

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Directions service | `9e601a4` | services/directions.ts |
| Task 2: Location hook + permission UX | `171dec9` | hooks/use-driver-location.ts, app/(driver)/index.tsx, app/(commuter)/index.tsx |

## Deviations from Plan

None - plan executed exactly as written.

Note: `npm run lint` shows 1 pre-existing error (`react/no-unescaped-entities` in `commuter-login.tsx`) and 11 pre-existing warnings. No new lint errors or warnings introduced by this plan.

## Known Stubs

None. Both new files are fully implemented with real data sources.

## Self-Check: PASSED

- services/directions.ts exists and exports fetchDirections, decodePolyline, DirectionsResult, RouteStep
- hooks/use-driver-location.ts exists and exports useDriverLocation
- Both screen files contain 'Location Required' Alert with Linking.openSettings()
- app/(commuter)/index.tsx imports Linking from react-native
- All files pass TypeScript type checking (npx tsc --noEmit passes for non-functions/ files)
- Commits 9e601a4 and 171dec9 exist in git history
