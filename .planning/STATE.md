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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [2026-03-15]: Pivot from independent driver marketplace to company-based B2B dispatch — tow yards are the customers, drivers authenticate via company email, jobs route to nearest affiliated tow yard
- [2026-03-15]: Defer Stripe payments entirely to v2 — focus on dispatch operations and company management first
- [Pre-work]: Use expo-notifications + expo-server-sdk via Cloud Functions (NOT @react-native-firebase/messaging — conflicts with Firebase JS SDK v12)
- [Pre-work]: New React Native Architecture enabled (newArchEnabled: true)

### Pending Todos

None yet.

### Blockers/Concerns

- [Architecture]: Existing data model has no "company" entity — new Firestore schema needed: `companies` collection, driver-company association field, company-level dispatch logic (Phase 1)
- [Auth]: Current driver auth is standalone; needs to be linked to company on login via company email (Phase 1)
- [Dispatch]: Current geohash-based matching finds nearest individual driver — must be replaced with company-based routing (Phase 2)

## Session Continuity

Last session: 2026-03-15
Stopped at: Roadmap created — ready to plan Phase 1
Resume file: None
