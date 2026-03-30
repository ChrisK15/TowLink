---
status: complete
phase: 04-driver-flow-maps
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: 2026-03-30T00:00:00Z
updated: 2026-03-30T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Driver Route Polyline and InstructionCard
expected: With an active en_route trip, driver screen shows a blue route polyline on the map from driver location to pickup. An InstructionCard overlay appears at the top showing the current turn-by-turn instruction with a maneuver icon.
result: pass

### 2. Cancel Job Button (en_route only)
expected: During en_route status, a "Cancel Job" button is visible in the ActiveTripSheet. Tapping it shows a confirmation Alert. Confirming resets the request back to "searching" for re-dispatch. The button is NOT visible during other trip statuses (arrived, in_progress).
result: pass

### 3. Open in Maps Button
expected: An "Open in Maps" button appears in the ActiveTripSheet below the pickup address. Tapping it opens Google Maps (or Apple Maps fallback) with directions to the pickup/dropoff location.
result: pass

### 4. Commuter Driver Marker on Map
expected: When a driver is assigned and en_route, the commuter screen shows a blue navigation arrow marker on the map at the driver's current location. The marker moves smoothly as the driver's position updates.
result: pass

### 5. Commuter Route Polyline
expected: Commuter screen shows a blue route polyline. During en_route/arrived it shows the route from driver to pickup. During in_progress it switches to show the route from pickup to dropoff.
result: pass

### 6. Commuter Live ETA
expected: The CommuterTripSheet displays a live ETA from the Directions API (e.g., "12 mins") instead of the old hardcoded "8 min away". If ETA is unavailable, it shows "-- min away".
result: pass

### 7. Location Permission Denial UX
expected: Denying location permission on either the driver or commuter screen shows an alert titled "Location Required" with a descriptive message and an "Open Settings" button that opens the device settings.
result: pass

### 8. Active Trip Restoration on Reload
expected: If the app is reloaded (or the screen remounts) while a trip is active, both the driver and commuter screens restore the active trip state automatically — no blank screen or lost trip.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
