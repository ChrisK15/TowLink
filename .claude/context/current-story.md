# Current Story: TOW-51

## Story Details
- **ID**: TOW-51
- **Title**: Basic Request Pop-Up UI
- **Epic**: EPIC 3: Driver Job Management
- **Priority**: Medium
- **Sprint**: TOW Sprint 2 (2026-02-12 to 2026-02-24)
- **Story Points**: 3
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/jira/software/projects/TOW/board?selectedIssue=TOW-51

## Description
**As a** driver
**I want to** see a request slide up from the bottom of my screen
**So that** I can view the details before deciding to accept

## Acceptance Criteria
- Bottom sheet component created (slides up from bottom, Uber-style)
- Displays commuter info: name, pickup address, service type, car details
- "Accept" and "Decline" buttons present
- Smooth animation when appearing/disappearing
- Pop-ups can only shows when driver is online

## Technical Notes
- Use `@gorhom/bottom-sheet` or similar library
- For now, manually trigger pop-up (hardcoded request for testing)
- Buttons don't need to work yet - just UI
- Focus on smooth UX

## Dependencies
- Requires driver to be in online state (from TOW-50)
- Will need connection to Firebase for real requests in future stories
- This is UI-only for now - no actual job acceptance logic

## Next Steps
Invoke the **technical-architect** agent to create a detailed implementation specification.
