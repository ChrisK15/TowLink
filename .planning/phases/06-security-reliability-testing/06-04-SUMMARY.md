---
phase: 06-security-reliability-testing
plan: "04"
subsystem: emulator-seed
status: checkpoint-pending
tags: [seed-data, emulator, testing, firebase]
dependency_graph:
  requires: [06-01]
  provides: [TEST-01]
  affects: [emulator-seed]
tech_stack:
  added: []
  patterns: [admin-sdk-setDoc, seed-data-expansion]
key_files:
  created: []
  modified:
    - scripts/seed-emulator.js
decisions:
  - "seedPhase6Scenarios() receives commuterId/driverId/companyId as params — avoids re-reading globals inside async function"
  - "driverPath: [] added to trip documents — satisfies Trip interface completeness without generating fake path data"
metrics:
  duration: "49s (Task 1 only; checkpoint pending human verify)"
  completed_date: "2026-03-25"
  tasks_completed: 1
  tasks_total: 2
  files_modified: 1
---

# Phase 06 Plan 04: Expanded Seed Data and Phase 6 Verification Summary

**One-liner:** Emulator seed expanded with completed-trip (completionTime/finalPrice) and in-progress-trip (Phase 4-7 fields) scenarios via appended seedPhase6Scenarios() function.

## Objective

Expand the emulator seed script with new test scenarios (completed trip, in-progress trip) and verify the full phase via human testing. D-10 requires expanded seed data for testing Phase 4-7 features.

## Tasks Completed

### Task 1: Expand emulator seed script — DONE

**Commit:** c099704

Added `async function seedPhase6Scenarios(commuterId, driverId, companyId)` to `scripts/seed-emulator.js`:

1. **Completed trip** (`seed-trip-completed`) — status: 'completed', startTime/arrivalTime/startedAt/completionTime timestamps, estimatedPrice: 75, finalPrice: 82.50, distance: 8.5, companyId: 'test-company-01'
2. **In-progress trip** (`seed-trip-inprogress`) — status: 'in_progress', startTime/arrivalTime/startedAt timestamps, estimatedPrice: 65, distance: 0, companyId: 'test-company-01'
3. **Completed request** (`seed-request-completed`) — status: 'accepted', matchedDriverId set, commuterId/companyId matching trip
4. **In-progress request** (`seed-request-inprogress`) — status: 'accepted', matchedDriverId set, commuterId/companyId matching trip

Function is called at end of `seed()` after all existing calls. Existing seed entries untouched.

### Task 2: Human verification of Phase 6 requirements — PENDING

Awaiting human verification at checkpoint.

## Deviations from Plan

None — plan executed exactly as written for Task 1.

## Known Stubs

None — seed data is complete and intentional.

## Self-Check: PASSED

- scripts/seed-emulator.js modified with seedPhase6Scenarios — CONFIRMED
- Commit c099704 exists — CONFIRMED
- All acceptance criteria met (2 occurrences of seedPhase6Scenarios, status:'completed' with completionTime/finalPrice, status:'in_progress' with companyId, both request documents present)
