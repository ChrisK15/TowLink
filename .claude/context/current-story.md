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
**I want to** navigate to an active trip screen with expandable trip details
**So that** I can see the map and manage trip information simultaneously

## Acceptance Criteria

### Navigation & Screen Setup
- [ ] Accepting request navigates to active trip screen
- [ ] RequestPopup modal slides down when driver accepts
- [ ] ActiveTrip screen slides up immediately after
- [ ] Screen displays full-screen map with driver's current location
- [ ] Screen listens to trip document for real-time updates

### Expandable Modal (Bottom Sheet UX)
- [ ] Modal overlays the map, starting at 15% - 25% of screen height (test to see what's better)
- [ ] Tapping the drag handle toggles between 25% (collapsed) and 90% (expanded)
- [ ] Smooth spring animation when transitioning between states
- [ ] Modal has rounded top corners and shadow

### Collapsed Content (Always Visible at 25%)
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
- [ ] Dropoff address (if provided)
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

## Next Steps
Invoke the `technical-architect` agent to create a detailed implementation specification for this story. Key areas to cover:

1. Screen navigation flow - how to transition from RequestPopup to ActiveTrip screen
2. Bottom sheet / expandable modal architecture (Reanimated 2 + Gesture Handler vs. libraries like `@gorhom/bottom-sheet`)
3. Spring animation configuration for the toggle between collapsed (25%) and expanded (90%) states
4. Real-time Firestore listener for the active trip document
5. Map integration with driver's current location marker
6. Communication buttons (Call / SMS) using `Linking` API
7. Layout and component breakdown (collapsed vs. expanded content areas)
8. Design reference integration from `.claude/design/screens/active_trip_modal.png`

**Command**: Use `technical-architect` to analyze TOW-68 and create implementation specs
