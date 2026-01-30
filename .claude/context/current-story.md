# Current Story: TOW-7

## Story Details

- **ID**: TOW-7
- **Title**: US-1.1: User Sign Up with Email/Password
- **Epic**: TOW-1 (User Authentication & Account Management)
- **Priority**: CRITICAL ⭐
- **Sprint**: TOW Sprint 1 (Week 1-2)
- **Story Points**: 5
- **Status**: To Do
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-7

## Description

**As a** new user
**I want to** create an account with email and password
**So that** I can access the TowLink platform

## Acceptance Criteria

- [ ] User can enter email, password, and confirm password
- [ ] Password must be at least 8 characters
- [ ] Email validation checks for valid format
- [ ] Firebase Authentication creates user account
- [ ] User document created in Firestore `users` collection with fields: id, email, createdAt
- [ ] Error messages display for:
  - Email already in use
  - Weak password
  - Invalid email format
- [ ] Success message or auto-redirect after signup
- [ ] UI matches Figma designs (if available)

## Technical Notes

- Use Firebase Auth `createUserWithEmailAndPassword()`
- Store user profile in Firestore: `/users/{userId}`
- Need to create `services/firebase/authService.ts`
- Create signup screen component

## Files to Create/Modify

- `services/firebase/authService.ts` (new)
- `app/(auth)/signup.tsx` (new)
- Update navigation routing

## Dependencies

None - This is the foundational authentication story

## Next Steps

Invoke the `technical-architect` agent to create a detailed implementation specification for this story.
