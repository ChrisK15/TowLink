# Current Story: TOW-76

## Story Details
- **ID**: TOW-76
- **Title**: Multi-Step Request Form - Service Selection
- **Epic**: EPIC 2: Commuter Request Flow (TOW-2)
- **Priority**: Medium
- **Sprint**: TOW Sprint 3 (active, Feb 25 - Mar 11, 2026)
- **Story Points**: 3
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-76

## Description

**As a** commuter
**I want to** select the type of service I need
**So that** drivers know what help I require

## Acceptance Criteria

- Tapping "Request Roadside Assistance" slides up a selection modal (similar to `components/ActiveTripSheet.tsx` & `components/RequestPopup.tsx`)
- Modal shows "Towing" service card (highlighted/selected by default)
- Card shows: tow truck icon, "Towing" label, price range "$75-120"
- Other service types (Jump Start, Fuel Delivery, etc.) shown as disabled/grayed out
- "Continue" button at bottom
- Tapping Drag Handle button at top closes Modal
- No Back Button
- Matches Figma design (`commuter_request_flow_2a`)

## Technical Notes (from Jira)

- Create new component: `components/RequestServiceSheet.tsx`
- For MVP, only Towing is enabled
- Other service types are UI-only (not functional yet)
- Modal should fill basically the entire screen when slid up (95%)
- Consider using `ScrollView` since other stories will also populate this modal
- Design Reference: `.claude/design/screens/commuter_request_flow_2a.png`

## Dependencies

- **Blocks**: TOW-77 (Multi-Step Form - Location/Vehicle) - cannot start until TOW-76 is done
- **Depends on**: TOW-79 (Update Request Data Model for New Fields) - already Done, data model is ready
- No other blockers

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation spec at `.claude/specs/TOW-76.md`.
