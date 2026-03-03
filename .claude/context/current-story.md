# Current Story: TOW-77

## Story Details

- **ID**: TOW-77
- **Title**: Multi-Step Form - Location/Vehicle
- **Epic**: EPIC 2: Commuter Request Flow (TOW-2)
- **Priority**: Medium
- **Sprint**: TOW Sprint 3 (active, Feb 25 - Mar 11, 2026)
- **Story Points**: 5
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-77

## Description

**As a** commuter
**I want to** provide my location and vehicle information
**So that** drivers know where to find me and what vehicle needs service

## Acceptance Criteria

**Inside `RequestServiceSheet` (created in TOW-76), add three sections below service selection:**

**Pickup Location Section:**

- "Detect My Location" button (uses GPS to fill field)
- Manual address input field
- Tapping "Detect" populates the input with current GPS coordinates
- Field is required

**Drop-off Location Section:**

- Address input field
- Field is required
- Can type manually or use map picker (future enhancement)

**Vehicle Details Section:**

- Year input (numeric)
- Make input (text)
- Model input (text)
- All three required

**Additional Notes:**

- Optional text area for special instructions
- All sections are in one scrollable modal - no navigation between sections, user scrolls down
- Form validation prevents proceeding if required fields are empty
- Matches Figma design (`commuter_request_flow_2b.png`)

## Technical Notes (from Jira)

- Add sections to the existing `RequestServiceSheet` component (do NOT create a new component)
- "Detect My Location" reuses GPS code from `commuter/index.tsx`
- Store form data in component state
- No Firestore write yet - that happens in TOW-78
- Design References:
  - `.claude/design/screens/commuter_request_flow_2b.png`

## Dependencies

- **Blocked by**: TOW-76 (Multi-Step Request Form - Service Selection) - status is **Done**, blocker is cleared
- **Blocks**: TOW-78 (Price Breakdown & Request Confirmation) - cannot start until TOW-77 is done
- **Note**: No Firestore write happens in this story - data is held in component state until TOW-78

## Sprint Context

TOW-77 is part of TOW Sprint 3 (Feb 25 - Mar 11, 2026). The story is currently In Progress. The blocking dependency (TOW-76) is Done, meaning this story is fully unblocked and ready for implementation. The git branch `TOW-77-multi-step-form-location-vehicle` already exists and is the current working branch.

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation spec at `.claude/specs/TOW-77.md`.
