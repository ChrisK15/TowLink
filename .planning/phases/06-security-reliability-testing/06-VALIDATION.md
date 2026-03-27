---
phase: 6
slug: security-reliability-testing
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-25
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x + jest-expo 55.x |
| **Config file** | jest.config.js (Wave 0 installs) |
| **Quick run command** | `npx jest --bail --testPathPattern` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --bail --testPathPattern`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | TEST-01 | infra | `npx jest --version` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | SEC-01 | rules-unit | `npx jest --selectProjects rules` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | TEST-01, D-09 | unit | `npx jest --selectProjects unit` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | SEC-02, SEC-03 | lint | `npm run lint` | N/A | ⬜ pending |
| 06-02-02 | 02 | 1 | SEC-04 | lint | `npm run lint` | N/A | ⬜ pending |
| 06-03-01 | 03 | 2 | SEC-03 | lint | `npm run lint` | N/A | ⬜ pending |
| 06-03-02 | 03 | 2 | SEC-03 | lint | `npm run lint` | N/A | ⬜ pending |
| 06-03-03 | 03 | 2 | SEC-02 | lint | `npm run lint` | N/A | ⬜ pending |
| 06-04-01 | 04 | 2 | TEST-01 | grep | `grep -c seedPhase6Scenarios scripts/seed-emulator.js` | N/A | ⬜ pending |
| 06-04-02 | 04 | 2 | ALL | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `jest` + `jest-expo` + `@types/jest` — install test framework (Plan 01, Task 1)
- [x] `jest.config.js` — configure jest-expo preset (Plan 01, Task 1)
- [x] `@firebase/rules-unit-testing` — install rules testing package (Plan 01, Task 1)
- [x] `__tests__/` directory structure — create test scaffolding (Plan 01, Tasks 2-3)

*Wave 0 is addressed by Plan 01 Task 1 (infra) which runs first in Wave 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Route flicker fix | SEC-04 | Requires real device splash screen behavior | 1. Kill app 2. Cold launch 3. Verify no flash of wrong screen before dashboard |
| Loading indicator UX | SEC-02 | Visual feedback timing subjective | 1. Trigger Firebase op 2. Verify spinner appears within 100ms |
| Toast notification UX | SEC-03 | Visual toast appearance | 1. Trigger error 2. Verify toast auto-dismisses after ~3s |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
