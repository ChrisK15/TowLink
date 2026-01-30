# Current Story: TOW-8

## Story Details

- **ID**: TOW-8
- **Title**: US-1.2: Role Selection During Signup
- **Epic**: TOW-1 (User Authentication & Account Management)
- **Priority**: CRITICAL ⭐
- **Sprint**: TOW Sprint 1 (Week 1-2)
- **Story Points**: 3
- **Status**: To Do
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-8

## Description

**As a** new user
**I want to** select whether I'm a commuter or driver during signup
**So that** the app shows me the correct interface

## Acceptance Criteria

- [ ] Role selection screen appears after email/password signup
- [ ] Two clear options: "I need a tow" (Commuter) or "I'm a tow truck driver" (Driver)
- [ ] Role is saved to user document in Firestore: `role: 'commuter' | 'driver'`
- [ ] User cannot proceed without selecting a role
- [ ] UI is clear and visually distinct between options

## Technical Notes

- Update Firestore user document: `{ role: 'commuter' }` or `{ role: 'driver' }`
- This role determines navigation routing in next stories
- Should integrate seamlessly with the existing signup flow created in TOW-7

## Dependencies

- **TOW-7** (User Sign Up with Email/Password) - ✅ COMPLETED
  - This story builds on the signup flow established in TOW-7
  - The role selection screen will appear after successful account creation

## Context from Previous Story

TOW-7 implemented the foundational user signup with email/password authentication. The signup screen is located at `app/(auth)/signup.tsx`, and the authentication service is in `services/firebase/authService.ts`. TOW-8 now adds the critical role selection step that determines whether a user will use the commuter or driver interface.

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation specification for this story.
