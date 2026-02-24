# Current Story: TOW-68

## Story Details
- **ID**: TOW-68
- **Title**: Active Trip Screen with Expandable Modal
- **Epic**: TOW-3 - EPIC 3: Driver Job Management
- **Priority**: Medium
- **Sprint**: TOW Sprint 2 (Feb 12 - Feb 24, 2026)
- **Story Points**: 8
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-68

## Description
**As a** driver
**I want to** see the active trip modal slide up from the bottom of my screen
**So that** I can see the map and manage trip information simultaneously

## Acceptance Criteria

### Navigation & Screen Setup
- [ ] Accepting request slides down RequestPopup and slides up ActiveTrip modal
- [ ] RequestPopup modal slides down when driver accepts
- [ ] ActiveTrip modal slides up immediately after
- [ ] Modal displays full-screen map with driver's current location
- [ ] Screen listens to trip document for real-time updates

### Expandable Modal (Bottom Sheet UX)
- [ ] Modal overlays the map, starting at 15% - 25% of screen height (test to see what's better)
- [ ] Tapping the drag handle toggles between 25% (collapsed) and 90% (expanded)
- [ ] Smooth spring animation when transitioning between states
- [ ] Modal has rounded top corners

### Collapsed Content (Always Visible at ~20%)
- [ ] Drag handle (gray bar, centered)
- [ ] Trip status text (e.g., "En Route to Pickup")
- [ ] Customer name
- [ ] Brief location info

### Expanded Content (Visible at 90%)
- [ ] Distance to pickup/dropoff
- [ ] ETA (estimated time)
- [ ] Customer name and phone number
- [ ] Call button (opens phone dialer)
- [ ] Text button (opens SMS app)
- [ ] Service type
- [ ] Pickup address
- [ ] Dropoff address
- [ ] Estimated fare
- [ ] All content scrollable if needed

### Visual Design
- [ ] Use design reference as inspiration: `.claude/design/screens/active_trip_modal.png`
- [ ] Proper spacing and typography

## Dependencies
- Split from TOW-19 (US-3.3: Accept Request - Complete UI)
- Builds on TOW-51 (Basic Request Pop-Up UI) - Done
- Builds on TOW-52 (Request Assignment & Claiming Logic) - Done
- Builds on TOW-53 (Integrate Real-Time Request Listening) - Done
- Builds on TOW-50 (Driver Home Screen Online/Offline Toggle) - Done
- TOW-70 (Trip State Machine & Progress Tracking) is a related upcoming story (To Do)

## Architecture Decisions (Finalized)

- **Single-screen approach**: No separate screen. The driver home screen (`index.tsx`) map is always the backdrop. `activeTripId` state determines what overlays on top.
- **Bottom sheet**: React Native `Modal` + `Animated` API. `@gorhom/bottom-sheet` was abandoned during TOW-51 — do not use.
- **Slide-up entrance**: `animationType="slide"` on the Modal handles the slide-up for free.
- **Snap points**: `Animated.spring` toggles between `SCREEN_HEIGHT * 0.20` (collapsed) and `SCREEN_HEIGHT * 0.90` (expanded). Test 0.15–0.25 for best collapsed height.

## Implementation Progress

- ✅ `listenToTrip` + `getRequestById` added to `services/firebase/firestore.ts`
- ✅ `useActiveTrip` hook created at `hooks/use-active-trip.ts`
- 🔄 Step 3: Update `app/(driver)/index.tsx` — add `activeTripId` state, wire accept handler
- ⏳ Step 4: Build `components/ActiveTripSheet.tsx`
- ⏳ Step 5: Add pickup/dropoff markers to `index.tsx`
- ⏳ Step 6: Wire Call/SMS buttons in `ActiveTripSheet`
- ⏳ Step 7: Status action button + trip completion handling

**Spec**: `.claude/specs/TOW-68.md`
**Progress**: `.claude/progress/TOW-68-progress.md`
