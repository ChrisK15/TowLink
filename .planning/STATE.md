---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 01-companies-admin/01-05-PLAN.md
last_updated: "2026-03-15T20:51:12.195Z"
last_activity: 2026-03-15 — Roadmap created for v1.0 Company-Based Dispatch Pivot (5 phases, 27 requirements mapped)
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 7
  completed_plans: 5
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** A stranded commuter can get a tow truck from a local affiliated tow yard dispatched to their exact GPS location in minutes, without the tow yard needing a manual dispatcher.
**Current focus:** Phase 1 — Companies & Admin

## Current Position

Phase: 1 of 5 (Companies & Admin)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-15 — Roadmap created for v1.0 Company-Based Dispatch Pivot (5 phases, 27 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
| Phase 01-companies-admin P01 | 6 | 2 tasks | 2 files |
| Phase 01-companies-admin P02 | 2 | 2 tasks | 2 files |
| Phase 01-companies-admin P03 | 2 | 2 tasks | 2 files |
| Phase 01-companies-admin P04 | 3 | 3 tasks | 6 files |
| Phase 01-companies-admin P05 | 64s | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [2026-03-15]: Pivot from independent driver marketplace to company-based B2B dispatch — tow yards are the customers, drivers authenticate via company email, jobs route to nearest affiliated tow yard
- [2026-03-15]: Defer Stripe payments entirely to v2 — focus on dispatch operations and company management first
- [Pre-work]: Use expo-notifications + expo-server-sdk via Cloud Functions (NOT @react-native-firebase/messaging — conflicts with Firebase JS SDK v12)
- [Pre-work]: New React Native Architecture enabled (newArchEnabled: true)
- [Phase 01-companies-admin]: Store geohash on company document at creation time using existing getGeohash() — avoids Phase 2 migration
- [Phase 01-companies-admin]: Separate companies.ts service file (not appended to firestore.ts) — domain-scoped separation
- [Phase 01-companies-admin]: listenToCompanyJobs() targets trips collection only — Jobs tab empty until Phase 2 dispatch populates companyId on trips
- [Phase 01-companies-admin]: Admin role excluded from updateUserRole() — admin role set only via manual Firestore seed to prevent privilege escalation
- [Phase 01-companies-admin]: companyId exposed in AuthContext alongside role — both onAuthStateChanged and refreshRole read and set companyId so admin dashboard hooks are unblocked
- [Phase 01-companies-admin]: findCompanyByEmail called BEFORE createUserWithEmailAndPassword to prevent zombie auth accounts
- [Phase 01-companies-admin]: signUpWithEmail() unchanged — commuter path unaffected; only driver signup uses new pre-auth function
- [Phase 01-companies-admin]: No explicit router.replace after driver signup — AuthContext onAuthStateChanged reads role=driver and routes to /(driver)
- [Phase 01-companies-admin]: Admin index.tsx checks authLoading before triggering company-setup redirect to prevent premature redirect during initial auth resolution
- [Phase 01-companies-admin]: Stub admin screens import hooks to validate full import chain via lint before Plans 05/06 replace the screen bodies
- [Phase 01-companies-admin]: Display commuterId truncated to 8 chars as placeholder until Phase 2/3 adds commuterName resolution
- [Phase 01-companies-admin]: StatusBadge inlined in index.tsx - single-use component not worth extracting to shared yet

### Pending Todos

None yet.

### Blockers/Concerns

- [Architecture]: Existing data model has no "company" entity — new Firestore schema needed: `companies` collection, driver-company association field, company-level dispatch logic (Phase 1)
- [Auth]: Current driver auth is standalone; needs to be linked to company on login via company email (Phase 1)
- [Dispatch]: Current geohash-based matching finds nearest individual driver — must be replaced with company-based routing (Phase 2)

## Session Continuity

Last session: 2026-03-15T20:51:12.193Z
Stopped at: Completed 01-companies-admin/01-05-PLAN.md
Resume file: None
