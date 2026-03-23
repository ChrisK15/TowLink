---
phase: 4
slug: driver-flow-maps
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None installed — manual testing via Firebase emulators + iOS Simulator |
| **Config file** | n/a |
| **Quick run command** | `npm run emulators && npm run emulators:seed` then manual |
| **Full suite command** | Manual verification steps per success criteria |
| **Estimated runtime** | ~5 minutes per full manual pass |

---

## Sampling Rate

- **After every task commit:** Run `npm run emulators && npm run emulators:seed` then manual smoke test
- **After every plan wave:** Full manual verification of all success criteria
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 300 seconds (manual testing)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | DRVR-01 | manual | Seed emulator, login as driver, verify RequestPopup accept/decline | n/a | pending |
| 04-01-02 | 01 | 1 | DRVR-02 | manual | Accept seeded request; verify InstructionCard appears; GPX simulation | n/a | pending |
| 04-01-03 | 01 | 1 | DRVR-03 | manual | Tap through all action buttons; verify Firestore status changes | n/a | pending |
| 04-01-04 | 01 | 1 | DRVR-04 | manual | Accept request, cancel, verify commuter sees FindingDriverModal | n/a | pending |
| 04-02-01 | 02 | 2 | MAP-01 | manual | Two-device test; verify driver marker on commuter map | n/a | pending |
| 04-02-02 | 02 | 2 | MAP-02 | manual | Verify blue polyline renders and ETA shows "N min away" | n/a | pending |
| 04-02-03 | 02 | 2 | MAP-03 | manual | Deny location in Settings; reopen app; verify Alert, no crash | n/a | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `scripts/seed-emulator.js` — add a pre-accepted trip (`status: 'en_route'`) to seed data so commuter screen tests don't require manually accepting a request first
- [ ] `testing/la-route.gpx` — GPX route file for iOS Simulator simulation between seed data pickup/dropoff coordinates

*No automated test framework to install — all validation is manual with emulator.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Accept/decline job from driver dashboard | DRVR-01 | UI interaction, no test framework | Seed emulator, login as driver, verify RequestPopup appears and accept/decline works |
| Map directions during active trip | DRVR-02 | Requires map rendering + GPS simulation | Accept a seeded request; verify InstructionCard appears; use GPX simulation for step advancement |
| Trip status advances through all stages | DRVR-03 | Multi-step UI flow with Firestore writes | Tap through all 3 action buttons; verify Firestore status changes in emulator UI |
| Driver cancel during en_route | DRVR-04 | Multi-screen flow (driver + commuter) | Accept request, verify Cancel Job button visible; cancel and confirm; verify commuter sees FindingDriverModal again |
| Driver marker on commuter map | MAP-01 | Requires two simultaneous sessions | Two-device (or two simulator instances) test; login both accounts with seeded trip |
| Route polyline and ETA on commuter map | MAP-02 | Visual verification of map rendering | Same as MAP-01; verify blue polyline renders and ETA shows "N min away" |
| Location permission denial graceful | MAP-03 | OS-level permission UI | On iOS Simulator: Settings > Privacy > Location > deny for TowLink; reopen app; verify Alert appears and does not crash |

---

## Validation Sign-Off

- [ ] All tasks have manual verification instructions
- [ ] Sampling continuity: manual smoke test after every task commit
- [ ] Wave 0 covers seed data and GPX file requirements
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
