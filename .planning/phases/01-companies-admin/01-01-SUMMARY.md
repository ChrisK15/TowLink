---
phase: 01-companies-admin
plan: 01
subsystem: database
tags: [firestore, typescript, firebase, geohash, company, dispatch]

# Dependency graph
requires: []
provides:
  - Company TypeScript interface (id, name, address, location, geohash, serviceRadiusKm, authorizedEmails[], ownerUid, createdAt)
  - Extended User interface with admin role, companyId, and isActive fields
  - Extended Trip interface with companyId field for dispatch filtering
  - createCompany() — geocodes address, writes company doc with geohash to Firestore
  - addAuthorizedEmail() — arrayUnion append to companies/{id}.authorizedEmails[]
  - findCompanyByEmail() — array-contains query for driver pre-authorization gate
  - deactivateDriver() — sets isActive=false on users/{uid} doc
  - listenToCompanyJobs() — real-time Firestore listener for active trips by companyId
  - listenToCompanyDrivers() — real-time Firestore listener for company driver roster
affects: [01-02, 01-03, 01-04, 01-05, phase-02-dispatch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Company Firestore service: all company CRUD/listener ops isolated in services/firebase/companies.ts (screens must not import firebase/firestore directly)"
    - "Pre-authorization email gate: findCompanyByEmail() queried BEFORE createUserWithEmailAndPassword() to prevent zombie auth accounts"
    - "Geohash stored at company write time: free Phase 2 win using existing getGeohash() utility"
    - "arrayUnion for authorizedEmails: idempotent append, no composite index needed"

key-files:
  created:
    - services/firebase/companies.ts
  modified:
    - types/models.ts

key-decisions:
  - "Store geohash on company document at creation time using existing getGeohash() — avoids Phase 2 migration, zero added complexity"
  - "All 6 company service functions in a dedicated companies.ts file (not appended to firestore.ts) — keeps firestore.ts scoped to request/trip operations, companies.ts owns company domain"
  - "listenToCompanyJobs() filters trips collection by companyId — Jobs tab will show empty until Phase 2 dispatch populates companyId on trip docs; this is expected behavior"
  - "findCompanyByEmail() uses single array-contains clause (no composite index required per Firestore docs)"

patterns-established:
  - "Company service pattern: domain-scoped service file per entity type (companies.ts separate from firestore.ts)"
  - "Email normalization: toLowerCase().trim() applied in both addAuthorizedEmail() and findCompanyByEmail() for case-insensitive matching"

requirements-completed: [COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, AUTH-01]

# Metrics
duration: 6min
completed: 2026-03-15
---

# Phase 1 Plan 01: Companies & Admin - Data Contracts and Service Layer Summary

**Company TypeScript interface and 6-function Firestore service layer (createCompany, addAuthorizedEmail, findCompanyByEmail, deactivateDriver, listenToCompanyJobs, listenToCompanyDrivers) with geohash storage and email pre-authorization gate**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-15T20:35:57Z
- **Completed:** 2026-03-15T20:41:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended types/models.ts with Company interface and admin role additions to User and Trip (required by all subsequent plans in this phase)
- Created services/firebase/companies.ts with all 6 company service functions matching the plan spec exactly
- Confirmed all 3 pre-existing lint errors are in unrelated files (commuter-login.tsx, driver/index.tsx, FindingDriverModal.tsx) — companies.ts introduces zero new lint errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend type definitions in types/models.ts** - `d979dce` (feat)
2. **Task 2: Create services/firebase/companies.ts** - `53c8298` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `types/models.ts` - Added Company interface; extended User with admin role + companyId + isActive; extended Trip with companyId
- `services/firebase/companies.ts` - New company service: createCompany, addAuthorizedEmail, findCompanyByEmail, deactivateDriver, listenToCompanyJobs, listenToCompanyDrivers

## Decisions Made
- **Geohash on company doc:** Stored geohash at company creation using existing `getGeohash()` utility. Phase 2 needs this for `geohashQueryBounds`-based nearest-company lookups — adding it now avoids a data migration.
- **Separate companies.ts file:** Rather than appending 6 functions to firestore.ts, created a domain-scoped service file. firestore.ts owns request/trip ops; companies.ts owns company ops. Cleaner separation as the codebase grows.
- **Jobs listener targets trips collection only:** Per RESEARCH.md open question resolution — `listenToCompanyJobs()` filters trips by companyId. Jobs tab will show empty until Phase 2 dispatch populates the companyId field on trip docs. This is the expected behavior and the correct design choice.
- **Email normalization:** `toLowerCase().trim()` applied in both `addAuthorizedEmail()` and `findCompanyByEmail()` to ensure case-insensitive matching regardless of how admins enter emails.

## Deviations from Plan

None - plan executed exactly as written. The 3 pre-existing lint errors (`react/no-unescaped-entities` in unrelated files) were confirmed pre-existing via `git stash` and are out of scope per deviation rules.

## Issues Encountered
- Pre-existing lint errors in commuter-login.tsx, driver/index.tsx, FindingDriverModal.tsx were present before this plan and are not caused by changes here. Logged for deferred fix.

## User Setup Required
None - no external service configuration required for this plan. The next plan (01-02) will require a Firebase console seed step to create the first admin user (set `users/{uid}.role = 'admin'` and `users/{uid}.companyId`).

## Next Phase Readiness
- All type contracts are in place — Wave 2 plans (auth extension, driver signup, admin screens) can now reference Company, extended User, and extended Trip without guessing
- services/firebase/companies.ts is the canonical import for all company Firestore operations
- Geohash is stored at company creation — Phase 2 nearest-company dispatch queries are ready to consume it
- Pre-existing lint errors in unrelated files should be resolved before phase gate review

## Self-Check: PASSED

- FOUND: types/models.ts
- FOUND: services/firebase/companies.ts
- FOUND: 01-01-SUMMARY.md
- FOUND: commit d979dce (Task 1)
- FOUND: commit 53c8298 (Task 2)

---
*Phase: 01-companies-admin*
*Completed: 2026-03-15*
