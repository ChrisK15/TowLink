---
phase: 3
slug: maestro-e2e-testing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Maestro CLI 2.2.0 |
| **Config file** | `.maestro/` directory (each flow is a YAML file) |
| **Quick run command** | `maestro test .maestro/admin-basic.yaml` |
| **Full suite command** | `maestro test .maestro/` |
| **Estimated runtime** | ~60-90 seconds (5 flows on iOS Simulator) |

---

## Sampling Rate

- **After every task commit:** Run `maestro test .maestro/admin-basic.yaml`
- **After every plan wave:** Run `maestro test .maestro/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | SC-1 | Smoke | `maestro test .maestro/admin-basic.yaml` | Wave 0 | pending |
| 03-02-01 | 02 | 2 | TEST-01 | E2E | `maestro test .maestro/commuter-happy-path.yaml` | Wave 0 | pending |
| 03-02-02 | 02 | 2 | TEST-01 | E2E | `maestro test .maestro/commuter-no-drivers.yaml` | Wave 0 | pending |
| 03-02-03 | 02 | 2 | TEST-01 | E2E | `maestro test .maestro/driver-accept-complete.yaml` | Wave 0 | pending |
| 03-02-04 | 02 | 2 | TEST-01 | E2E | `maestro test .maestro/driver-decline.yaml` | Wave 0 | pending |
| 03-02-05 | 02 | 2 | TEST-01 | E2E | `maestro test .maestro/admin-basic.yaml` | Wave 0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `.maestro/subflows/login-commuter.yaml` — shared commuter login
- [ ] `.maestro/subflows/login-driver.yaml` — shared driver login
- [ ] `.maestro/subflows/login-admin.yaml` — shared admin login
- [ ] `.maestro/commuter-happy-path.yaml` — commuter request flow
- [ ] `.maestro/commuter-no-drivers.yaml` — commuter error state
- [ ] `.maestro/driver-accept-complete.yaml` — driver accept + complete
- [ ] `.maestro/driver-decline.yaml` — driver decline scenario
- [ ] `.maestro/admin-basic.yaml` — admin navigation
- [ ] `scripts/seed-emulator.js` — deterministic test data
- [ ] `.env.test` — emulator env flag
- [ ] `firebase.json` — add auth emulator entry
- [ ] `app.config.js` — explicit `ios.bundleIdentifier`
- [ ] `services/firebase/config.ts` — emulator connection guard
- [ ] Expo dev build installed on iOS Simulator
- [ ] `testID` props on interactive elements

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dev build installs on simulator | SC-1 | One-time build step, not repeatable in CI-less setup | Run `npx expo run:ios`, verify app launches |
| Emulator UI accessible | D-01 | Browser-based check | Open `http://localhost:4000`, verify Auth + Firestore tabs present |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
