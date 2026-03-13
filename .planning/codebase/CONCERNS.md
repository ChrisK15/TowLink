# CONCERNS.md — Technical Debt & Issues

**Project:** TowLink
**Focus:** tech debt, bugs, security, performance, fragile areas
**Generated:** 2026-03-13

---

## Summary

TowLink is a university capstone React Native app in active development (Phase 2). The codebase has meaningful technical debt concentrated in type safety, error handling, test coverage, and security — all typical for an early-stage project. Critical issues are around race conditions in auth/request claiming and missing Firestore security rules validation.

---

## Type Safety

**Severity: High**

- 44+ instances of `error: any` type assertions in catch blocks across the codebase
- Pattern: `catch (error: any) { console.log(error.message) }` — unsafe, swallows type info
- Files affected: `services/firebase/firestore.ts`, `app/(tabs)/commuter.tsx`, `app/(tabs)/driver.tsx`, and others
- Should use typed error handling: `error instanceof Error ? error.message : String(error)`

---

## Race Conditions

**Severity: High**

### Auth Context Race
- `hooks/use-auth.ts` — auth state may be read before Firebase initializes
- No loading guard before consuming auth state in screens
- Could cause unauthenticated Firestore reads or navigation flicker

### Request Claiming Race
- Driver "accept request" flow lacks optimistic locking
- Multiple drivers could simultaneously claim the same request
- No Firestore transaction or atomic update to prevent double-claiming
- File: `services/firebase/firestore.ts` — `acceptTowRequest()`

---

## Missing Error Boundaries

**Severity: Medium**

- No React error boundaries defined anywhere in the app
- Unhandled render errors will crash the entire app
- Maps component errors (Google Maps SDK failures) are unguarded
- Recommended: wrap `MapView` and async data screens with error boundaries

---

## Test Coverage

**Severity: High**

- Zero automated tests — no unit, integration, or E2E tests exist
- No test framework configured (no Jest config, no test files)
- Critical business logic (request matching, pricing, geohash queries) untested
- `TESTING.md` covers what should be tested but nothing is implemented

---

## Security Gaps

**Severity: High**

### Firestore Security Rules
- Security rules likely not validated against all data model edge cases
- Missing field-level validation in rules (e.g., price bounds, status transitions)
- Drivers may be able to write to commuter documents or vice versa without strict rules

### API Keys
- Google Maps API key exposed in `app.config.js` / `.env` — needs restriction by bundle ID in Google Cloud Console
- Firebase config in `services/firebase/config.ts` — acceptable for client apps but should be reviewed

### Input Validation
- No sanitization of user-provided text (location descriptions, etc.)
- Numeric fields (pricing) lack min/max validation on the client

---

## Performance Bottlenecks

**Severity: Medium**

### Large Components
- `app/(tabs)/commuter.tsx` is becoming a large monolithic screen component
- `app/(tabs)/driver.tsx` similarly bloated — state, UI, and business logic mixed
- Should be split into smaller focused components + custom hooks

### Geohash Query Scaling
- `geofire-common` geohash queries require fetching multiple Firestore ranges and merging client-side
- Will not scale well beyond ~1000 active requests in an area
- No pagination implemented for driver dashboard request list

### Real-time Listener Cleanup
- Firestore `onSnapshot` listeners must be unsubscribed on unmount
- Some listeners may not be properly cleaned up, causing memory leaks and duplicate updates
- Pattern to verify in: `services/firebase/firestore.ts` listener returns

---

## Hardcoded Magic Numbers

**Severity: Low-Medium**

- Pricing calculations use hardcoded rates (base fee, per-km rate)
- Geohash precision constants hardcoded inline rather than in config
- Should be moved to `constants/` directory for maintainability

---

## Offline Support

**Severity: Medium**

- No offline handling — app will fail silently or show blank screens when offline
- Firebase Firestore offline persistence not explicitly enabled
- No network state detection or user-facing offline indicator

---

## Missing Features (Planned but Not Implemented)

- **Stripe payments**: Referenced in CLAUDE.md and architecture docs but not started
- **Driver rating system**: Data model has `rating` field but no UI or logic
- **Push notifications**: No Firebase Cloud Messaging setup
- **Background location**: Driver location updates require foreground app — needs background task handling

---

## Fragile Areas

| Area | Risk | File |
|------|------|------|
| Auth initialization | Race condition on app start | `hooks/use-auth.ts` |
| Request claiming | Double-claim race | `services/firebase/firestore.ts` |
| Geolocation permissions | Crash if denied without graceful fallback | `app/(tabs)/commuter.tsx` |
| Google Maps render | No error boundary if Maps fails to load | `app/(tabs)/commuter.tsx` |
| Real-time listeners | Memory leaks if not unsubscribed | `services/firebase/firestore.ts` |

---

## Recommendations (Priority Order)

1. Add Firestore transactions to request claiming to prevent race conditions
2. Implement typed error handling (replace `error: any`)
3. Add React error boundaries around Maps and async screens
4. Enable Firestore offline persistence
5. Set up Jest + basic unit tests for business logic
6. Restrict Google Maps API key in Google Cloud Console
7. Audit and tighten Firestore security rules
8. Break large screen components into smaller pieces
