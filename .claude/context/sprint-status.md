# TOW Sprint 3 Status

**Sprint Name**: TOW Sprint 3
**Sprint Dates**: February 25, 2026 - March 11, 2026
**Sprint State**: Active
**Sprint Goal**: Build the Multi-Step Commuter Request Flow (Service Selection, Location/Vehicle, Price Confirmation) and complete supporting account setup screens

---

## Sprint Summary

- **Total Stories**: 9
- **Completed (Done)**: 2
- **In Progress**: 1
- **To Do**: 6
- **Total Story Points**: 30

---

## Stories in Sprint

### Done

| Key | Title | Type | Points | Status |
|-----|-------|------|--------|--------|
| TOW-57 | Update Firebase Security Rules | Task | 1 | Done |
| TOW-79 | Update Request Data Model for New Fields | Story | 2 | Done |

### In Progress

| Key | Title | Type | Points | Status |
|-----|-------|------|--------|--------|
| TOW-76 | Multi-Step Request Form - Service Selection | Story | 3 | **In Progress** (ACTIVE) |

### To Do

| Key | Title | Type | Points | Status |
|-----|-------|------|--------|--------|
| TOW-77 | Multi-Step Form - Location/Vehicle | Story | 5 | To Do |
| TOW-78 | Price Breakdown & Request Confirmation | Story | 3 | To Do |
| TOW-74 | FE Sprint 3A - Commuter Account Setup Screen | Task | 3 | To Do |
| TOW-75 | FE Sprint 3B - Driver Account Setup Screen | Task | 3 | To Do |
| TOW-16 | US-2.4: See Assigned Driver Details | Story | 8 | To Do |
| TOW-24 | US-4.5: Location Permission Handling | Story | 2 | To Do |

---

## TOW-76 Detail: Multi-Step Request Form - Service Selection

- **ID**: TOW-76
- **Title**: Multi-Step Request Form - Service Selection
- **Epic**: EPIC 2: Commuter Request Flow (TOW-2)
- **Priority**: Medium
- **Story Points**: 3
- **Status**: In Progress
- **Assignee**: Chris Kelamyan
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-76

### Description

**As a** commuter
**I want to** select the type of service I need
**So that** drivers know what help I require

### Acceptance Criteria

- Tapping "Request Roadside Assistance" slides up a selection modal (similar to `components/ActiveTripSheet.tsx` & `components/RequestPopup.tsx`)
- Modal shows "Towing" service card (highlighted/selected by default)
- Card shows: tow truck icon, "Towing" label, price range "$75-120"
- Other service types (Jump Start, Fuel Delivery, etc.) shown as disabled/grayed out
- "Continue" button at bottom
- Tapping Drag Handle button at top closes Modal
- No Back Button
- Matches Figma design (`commuter_request_flow_2a`)

### Technical Notes

- Create new component: `component/RequestServiceSheet.tsx`
- For MVP, only Towing is enabled
- Other service types are UI-only (not functional yet)
- Modal should fill basically the entire screen when slid up (95%)
- Consider using `ScrollView` since other stories will also populate this modal
- Design Reference: `.claude/design/screens/commuter_request_flow_2a.png`

### Dependencies

- TOW-76 blocks TOW-77 (Multi-Step Form - Location/Vehicle must come after)
- TOW-79 (Update Request Data Model for New Fields) is Done - data model is ready

---

## Recommended Work Order

Based on dependencies and current state:

1. **TOW-76** - Multi-Step Request Form: Service Selection (IN PROGRESS - START HERE)
2. **TOW-77** - Multi-Step Form: Location/Vehicle (blocked by TOW-76)
3. **TOW-78** - Price Breakdown & Request Confirmation (follows Location/Vehicle step)
4. **TOW-74** - Commuter Account Setup Screen (independent, can be parallelized)
5. **TOW-75** - Driver Account Setup Screen (independent, can be parallelized)
6. **TOW-24** - Location Permission Handling (supporting infrastructure)
7. **TOW-16** - See Assigned Driver Details (higher complexity, 8 pts)

---

## Current Focus

**Active Story**: TOW-76 - Multi-Step Request Form - Service Selection
**Next Agent**: Invoke `technical-architect` to create implementation spec at `.claude/specs/TOW-76.md`

---

_Last Updated: 2026-02-27_
