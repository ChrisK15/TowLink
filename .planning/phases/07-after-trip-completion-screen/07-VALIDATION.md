---
phase: 7
slug: after-trip-completion-screen
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework installed; ESLint only |
| **Config file** | `.eslintrc.js` |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run lint` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run lint` + manual smoke test in emulator
- **Before `/gsd:verify-work`:** Full manual verification of all 7 scenarios below
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | SC-1, SC-2 | manual | `npm run lint` | N/A | pending |
| 07-01-02 | 01 | 1 | SC-1 | manual | `npm run lint` | N/A | pending |
| 07-01-03 | 01 | 1 | SC-2 | manual | `npm run lint` | N/A | pending |
| 07-01-04 | 01 | 1 | SC-3 | manual | `npm run lint` | N/A | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework to install — this project uses manual testing with Firebase emulators.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Driver sees completion screen after marking trip completed | SC-1 | UI overlay, no test framework | Emulator: advance trip to completed via ActiveTripSheet; confirm overlay appears |
| Commuter sees completion screen when trip is completed | SC-2 | UI overlay, no test framework | Emulator: driver completes trip; commuter screen shows overlay |
| Completion screen shows correct data (price, addresses, duration, name) | SC-1, SC-2 | Visual data verification | Compare screen values against Firestore trip document in emulator UI |
| "Done" returns driver to idle/offline state | SC-3 | State transition verification | After Done: driver sees online/offline toggle, activeTripId = null |
| "Done" returns commuter to request button state | SC-3 | State transition verification | After Done: commuter sees "Request Roadside Assistance" button |
| Back gesture dismisses screen and returns to idle | SC-3 | Platform-specific gesture | iOS: swipe down on Modal; Android: press back button |
| No completion screen shown for cancelled trips | SC-1, SC-2 | Negative test case | Cancel a trip during en_route; confirm no completion overlay appears |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
