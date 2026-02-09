# Current Story: TOW-12

## Story Details
- **ID**: TOW-12
- **Title**: US-6.1: Firebase Security Rules
- **Epic**: TOW-6 (EPIC 6: System Reliability & Security)
- **Priority**: Medium (marked CRITICAL in description)
- **Sprint**: TOW Sprint 1 (ends 2026-02-09)
- **Story Points**: 5
- **Status**: In Progress
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-12

## Description

**As a** system
**I want to** implement Firestore security rules
**So that** users can only access their own data

This is a critical security story to ensure data privacy and access control in the Firebase Firestore database. Without proper security rules, any authenticated user could potentially access or modify any data in the database.

## Acceptance Criteria

- [ ] Users can only read/write their own user document
- [ ] Commuters can create requests
- [ ] Drivers can read pending requests
- [ ] Drivers can update trips they're assigned to
- [ ] Only authenticated users can access the database
- [ ] Rules tested using Firebase emulator

## Technical Notes (from Jira)

Create `firestore.rules` file with these key rules:

```javascript
// Users can only access their own data
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Anyone authenticated can read pending requests
match /requests/{requestId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.commuterId == request.auth.uid;
}

// Trips can be read by commuter or driver, updated by driver
match /trips/{tripId} {
  allow read: if request.auth != null &&
    (resource.data.commuterId == request.auth.uid ||
     resource.data.driverId == request.auth.uid);
  allow update: if request.auth != null &&
    resource.data.driverId == request.auth.uid;
}
```

## Dependencies

- Firebase project must be properly configured
- Firebase CLI must be installed for testing with emulator
- Existing Firebase authentication setup (from previous stories)
- Understanding of Firestore data model (users, requests, trips collections)

## Security Considerations

This story is foundational for the entire app's security model. The rules must be:
1. **Restrictive by default** - Deny access unless explicitly allowed
2. **Properly authenticated** - All access requires valid authentication
3. **User data isolation** - Users can only access their own data
4. **Role-based access** - Commuters and drivers have different permissions
5. **Field validation** - Ensure required fields are present and valid

## Current Branch

TOW-12-us-6-1-firebase-security-rules (clean working directory)

## Next Steps

Invoke the **technical-architect** agent to create a detailed implementation specification at `.claude/specs/TOW-12.md`.

The technical architect should design:
1. **Complete Firestore security rules structure**
   - Rules for `/users/{userId}` collection
   - Rules for `/requests/{requestId}` collection
   - Rules for `/trips/{tripId}` collection
   - Default deny rules
2. **Field-level validation rules**
   - Required fields for each document type
   - Data type validation
   - Business logic validation (e.g., commuterId matches auth.uid)
3. **Testing strategy**
   - Firebase emulator setup
   - Test cases for each acceptance criterion
   - Negative test cases (unauthorized access attempts)
4. **Deployment process**
   - How to deploy rules to Firebase
   - Verification steps after deployment
