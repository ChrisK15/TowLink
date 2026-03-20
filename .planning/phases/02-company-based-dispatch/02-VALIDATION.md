---
phase: 2
slug: company-based-dispatch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (Cloud Functions) |
| **Config file** | `functions/jest.config.js` or "none — Wave 0 installs" |
| **Quick run command** | `cd functions && npm test` |
| **Full suite command** | `cd functions && npm test -- --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd functions && npm test`
- **After every plan wave:** Run `cd functions && npm test -- --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DISP-01 | unit | `cd functions && npm test -- --grep "nearest company"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DISP-02 | unit | `cd functions && npm test -- --grep "fair distribution"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | DISP-03 | unit | `cd functions && npm test -- --grep "decline reassign"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `functions/src/__tests__/dispatch.test.ts` — stubs for DISP-01, DISP-02, DISP-03
- [ ] `functions/jest.config.js` — Jest config if not already present
- [ ] Jest + ts-jest install — if no test framework detected in functions/

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Commuter sees "Searching for driver..." during dispatch | DISP-01 | UI state requires device/emulator | Submit request, observe modal stays in searching state |
| Commuter sees "[Driver] from [Company] is on the way" on accept | DISP-01 | UI rendering requires device | Accept from driver side, verify commuter screen updates |
| Re-assignment is invisible to commuter | DISP-03 | UI behavior during decline flow | Decline from driver, verify commuter stays on "Searching..." |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
