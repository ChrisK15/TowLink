# Phase 4: Driver Flow & Maps - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-21
**Phase:** 04-driver-flow-maps
**Areas discussed:** Driver navigation UX, Live location tracking, Route & ETA display, Driver cancel behavior

---

## Driver Navigation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Open external Maps app | Tap to open Apple Maps or Google Maps with pickup coordinates. Simpler but leaves the app. | |
| In-app route line only | Route polyline on map, no turn-by-turn. Driver relies on own sense of direction. | |
| In-app map directions (user's choice) | Google Directions API polyline + instruction banner card. No voice but next-turn text visible. | |

**User's choice:** In-app map directions — user specifically wanted navigation inside the app, not external.

**Follow-up: Route polyline + ETA vs full turn-by-turn with voice?**

| Option | Description | Selected |
|--------|-------------|----------|
| Route polyline + ETA | Draw route line, show ETA card. Driver follows visually. Uses Google Directions API. | ✓ |
| Full turn-by-turn with voice | Step-by-step with voice via Mapbox Navigation SDK. Requires swapping maps stack. | |

**User's choice:** Route polyline + ETA — after researching Mapbox Navigation SDK options (pricing, React Native libraries, integration complexity). User acknowledged polyline approach is better for capstone scope.

**Mapbox research conducted:** Reviewed @atomiqlab/react-native-mapbox-navigation (9 stars, Expo support), @pawan-pk/react-native-mapbox-navigation (49 stars, no Expo), expo-mapbox-navigation (1 star, Expo module). All carry integration risk for a capstone project.

**Follow-up: Open in Maps button placement?**

| Option | Description | Selected |
|--------|-------------|----------|
| Inside ActiveTripSheet | Navigate button near pickup address, consistent with existing layout | ✓ |
| Floating on map | Floating button on map, more visible but adds overlay clutter | |

**Follow-up: Maps app detection?**

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-detect | Try Google Maps first, fall back to Apple Maps. Single tap. | ✓ |
| Let driver choose | Action sheet with both options. Extra tap. | |

**Notes:** User initially wanted Uber-like navigation ("it removes the soul of the app"). After discussing Mapbox SDK complexity (new native deps, replacing Google Maps stack, small community libraries), agreed that Google Directions polyline + instruction cards + "Open in Maps" button is the right balance for capstone. GPX simulation for testing was a key factor.

---

## Live Location Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Every 3 seconds | Very smooth, ~20 writes/min. Higher Firestore usage. | |
| Every 5 seconds | Smooth enough for 'live' feel, ~12 writes/min. Good balance. | ✓ |
| Every 10 seconds | Slightly choppy, half the writes. More battery-friendly. | |

**User's choice:** Every 5 seconds

| Option | Description | Selected |
|--------|-------------|----------|
| Foreground only | Track only while app is active. No background permission needed. | ✓ |
| Background tracking | Continue when backgrounded. Requires 'Always Allow' permission, complex setup. | |

**User's choice:** Foreground only

| Option | Description | Selected |
|--------|-------------|----------|
| drivers/{uid}.currentLocation | Update existing field on driver doc. Commuter listens via driverId from trip. | ✓ |
| trips/{tripId}.driverLocation | Store on trip doc. Commuter already listens to trip. Adds frequent writes to shared doc. | |

**User's choice:** drivers/{uid}.currentLocation

---

## Route & ETA Display

| Option | Description | Selected |
|--------|-------------|----------|
| Stage-based | en_route: driver-to-pickup route. in_progress: pickup-to-dropoff route. Auto-switches. | ✓ |
| Driver-to-pickup only | Only show route from driver to commuter. Simpler, one API call. | |
| Both routes always | Show both with different colors. Could be cluttered. | |

**User's choice:** Stage-based

| Option | Description | Selected |
|--------|-------------|----------|
| Re-fetch every 30 seconds | Accurate ETA, ~2 API calls/min. Good balance for capstone. | ✓ |
| Re-fetch every 15 seconds | More responsive, ~4 calls/min. Higher API usage. | |
| Re-fetch every 60 seconds | Conservative, ETA could feel stale on short trips. | |
| Calculate once, count down | Fetch once, count down locally. Inaccurate with traffic/wrong turns. | |

**User's choice:** Re-fetch every 30 seconds

---

## Driver Cancel Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| en_route only | Cancel while driving to commuter. Committed once "I've Arrived" tapped. | ✓ |
| en_route + arrived | Cancel even after arriving, until "Start Service." Worse for commuter. | |

**User's choice:** en_route only

| Option | Description | Selected |
|--------|-------------|----------|
| Return to dispatch queue | Cancel trip, reset request to 'searching', Cloud Function re-assigns. Commuter sees "Searching..." again. | ✓ |
| Immediate fail to commuter | Cancel and make commuter start over. Worse experience. | |

**User's choice:** Return to dispatch queue

| Option | Description | Selected |
|--------|-------------|----------|
| Inside ActiveTripSheet | Red "Cancel Job" at bottom of sheet, with confirmation dialog. | ✓ |
| In status card at top | Small cancel icon in top overlay. Less prominent. | |

**User's choice:** Inside ActiveTripSheet

---

## Claude's Discretion

- Instruction card UI design (size, position, animation)
- Route polyline color and styling
- GPS-to-step matching threshold
- Location permission denial handling improvements
- Driver marker animation between updates
- Directions API error handling

## Deferred Ideas

- Mapbox Navigation SDK for full turn-by-turn with voice — v2 enhancement
- Background location tracking — v2, requires "Always Allow" permission
- Commuter cancel during active trip — COMM-01 is v2 requirement
