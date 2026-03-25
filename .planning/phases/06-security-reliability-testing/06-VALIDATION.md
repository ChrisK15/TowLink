---
phase: 6
slug: security-reliability-testing
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 06-02-01 | 02 | 1 | SEC-01 | rules-unit | `npx jest --testPathPattern rules` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | SEC-02 | rules-unit | `npx jest --testPathPattern rules` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 2 | SEC-03 | unit | `npx jest --testPathPattern loading` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | SEC-03 | unit | `npx jest --testPathPattern error` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 2 | SEC-04 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `jest` + `jest-expo` + `@types/jest` — install test framework
- [ ] `jest.config.js` — configure jest-expo preset
- [ ] `@firebase/rules-unit-testing` — install rules testing package
- [ ] `__tests__/` directory structure — create test scaffolding

*Jest + jest-expo not currently installed. Wave 0 MUST install before any test tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Route flicker fix | SEC-04 | Requires real device splash screen behavior | 1. Kill app 2. Cold launch 3. Verify no flash of wrong screen before dashboard |
| Loading indicator UX | SEC-03 | Visual feedback timing subjective | 1. Trigger Firebase op 2. Verify spinner appears within 100ms |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
