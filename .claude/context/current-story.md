# Current Story: TOW-16

## Story Details
- **ID**: TOW-16
- **Title**: US-2.4: See Assigned Driver Details
- **Epic**: EPIC 2: Commuter Request Flow (TOW-2)
- **Priority**: Medium
- **Sprint**: TOW Sprint 3 (active, ends 2026-03-11)
- **Story Points**: 8
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-16

## Description

**As a** commuter
**I want to** see when a driver accepts my request and track their arrival
**So that** I know who is coming and when they'll arrive

This story covers the full post-request flow on the commuter side: the "Finding Driver" loading state, the transition when a driver accepts, and the CommuterTripSheet component that tracks the trip through completion.

## Acceptance Criteria

### Part 1: Finding Driver Modal
- After creating request (TOW-78), `FindingDriverModal` appears
- Loading spinner with pulsing animation
- Text: "Finding the Best Available Driver"
- Subtext: "We're matching you with a qualified driver near your location. This usually takes a few seconds."
- Three-dot loading indicator
- "Cancel Request" button at bottom
- Real-time Firestore listener watching request document for status change

### Part 2: Driver Matched - Transition
- When status changes from 'searching' to 'accepted':
  - FindingDriverModal dismisses
  - Return to commuter home screen (map visible)
  - CommuterTripSheet component appears at bottom (similar to ActiveTripSheet on driver side)

### Part 3: CommuterTripSheet - Collapsed View (Initial State)
- Sheet starts at ~25% height (collapsed)
- Blue status banner at top:
  - Text: "Driver en route to your location"
  - ETA: "8 min away" (dynamic, calculated)
  - "Live" indicator with refresh icon
- Driver info row below banner:
  - Avatar with initials (circular, blue background)
  - Driver name (e.g., "Mike Johnson")
  - No Ratings (out of scope for MVP)
- Tappable drag handle to expand

### Part 4: CommuterTripSheet - Expanded View (90% height)
- Same collapsed content at top
- Vehicle information card:
  - Label "Vehicle" and "License"
  - e.g. "2023 Freightliner M2" | "TW-4892"
- Call and message icon buttons (circular, outlined)
- Progress checklist:
  - "Driver en route to your location" (active when status = 'en_route')
    - Subtitle: pickup address (e.g. "123 Main St, Downtown")
  - "Driver arrived" (active when status = 'arrived')
  - "Waiting to start service"
  - "Service in progress" (active when status = 'in_progress')
  - "Estimated 15-20 minutes"
  - "Complete"
  - "Rate your experience"
- Blue info banner at bottom: "Safety First - Stay in a safe location and keep your phone on..."
- Red "Cancel Trip" button at very bottom
- All content scrollable when expanded

### Part 5: Real-Time Updates
- Listen to trip document for status changes
- Update checklist when driver progresses (arrived -> in_progress -> completed)
- Update ETA as driver moves (Sprint 4 will add live location; for now use static estimate)
- Sheet persists through all trip states until completion

### Part 6: Trip Completion
- When trip status = 'completed', show completion UI (future story)
- For MVP: dismiss sheet and return to normal home screen

## Technical Notes

### FindingDriverModal Implementation
- Use same Modal pattern as `RequestPopup.tsx`
- Full-screen modal with semi-transparent backdrop
- Real-time listener on request document

### CommuterTripSheet Implementation
- Model after `ActiveTripSheet.tsx` (driver-side component)
- Same expandable modal pattern (Animated.View with height animation)
- Starts collapsed at ~25% height; tapping drag handle expands to 90%
- Uses ScrollView for expanded content
- Real-time listener on trip document (same hook pattern as driver side)

### Hook for Trip Data
- Reuse or create similar to `useActiveTrip` (driver-side hook)
- Fetches trip data, driver name, phone, and vehicle info
- Returns all data for CommuterTripSheet to display

### Call/Message Buttons
- Same implementation as `ActiveTripSheet`

### Progress Checklist
- Same component structure as `ActiveTripSheet`
- Different step labels (commuter perspective vs driver perspective)
- Steps update based on `trip.status`

### Design References
- Finding Driver: `.claude/design/screens/commuter_request_flow_3.png`
- Driver Matched: `.claude/design/screens/commuter_request_flow_4.png`
- Tracking (Collapsed & Expanded): `.claude/design/screens/commuter_request_flow_5.png`

## Out of Scope (MVP)
- Live driver location tracking on map
- Route polyline from driver to pickup
- Real-time ETA calculation based on driver movement
- Driver marker animation on map
- Ratings display

## Dependencies
- **Blocked by**: TOW-78 (Price Breakdown & Request Confirmation) - status is **Done**, blocker is cleared
- **Blocks**: nothing downstream in current sprint
- No other blockers. This story is fully unblocked.

## Sprint Context
TOW Sprint 3 ends 2026-03-11. TOW-16 is the only story currently In Progress assigned to Chris. The git branch `TOW-16-us-2-4-see-assigned-driver-details` is the active branch. TOW-78 (the direct predecessor) is Done, so all dependencies are cleared.

## Next Steps
Invoke the `technical-architect` agent to create a detailed implementation spec at `.claude/specs/TOW-16.md`, covering component architecture, hook design, Firestore listener patterns, and animation implementation plan.
