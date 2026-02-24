# Current Story: TOW-70

## Story Details
- **ID**: TOW-70
- **Title**: Trip State Machine & Progress Tracking
- **Epic**: EPIC 3: Driver Job Management (TOW-3)
- **Priority**: Medium
- **Sprint**: TOW Sprint 2 (active)
- **Story Points**: 5
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-70

## Description

**As a** driver
**I want to** progress through trip stages with clear visual feedback
**So that** I can complete the service workflow step-by-step

## Acceptance Criteria

### State Machine Implementation

- Trip progresses through states: `en_route` -> `arrived` -> `in_progress` -> `completed`
- Button in ActiveTrip modal updates text based on current state:
  - `en_route`: "I've Arrived"
  - `arrived`: "Start Service"
  - `in_progress`: "Complete Trip"
- Pressing button transitions to next state
- Firestore trip document updates with new status
- Timestamps recorded for each transition:
  - `arrivedAt` (when "I've Arrived" pressed)
  - `startedAt` (when "Start Service" pressed)
  - `completedAt` (when "Complete Trip" pressed)

### Dynamic Checklist

- Checklist displays 3 steps with dynamic completion status:
  1. "Drive to pickup location" (subtitle: pickup address)
     - Complete when status changes from `en_route` to `arrived`
  2. "Provide service" (subtitle: service type)
     - Complete when status changes from `arrived` to `in_progress`
  3. "Complete drop-off" (subtitle: dropoff address)
     - Complete when status = `completed`
- Checkmarks appear/animate when step is completed
- Current step is highlighted

### Error Handling

- If Firestore update fails, show error message
- Button is disabled while update is in progress
- Retry mechanism if network error

## Dependencies

- Split from TOW-19 (US-3.3: Accept Request - Complete UI), which is still To Do
- Builds on the ActiveTrip modal/screen established in TOW-68 (recently merged)
- Requires Firestore trip document with status field already in place

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation spec at `.claude/specs/TOW-70.md`.
