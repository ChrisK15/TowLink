# Phase 3: Maestro E2E Testing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-20
**Phase:** 03-maestro-e2e-testing
**Areas discussed:** Test environment, Flow coverage, Device targets, Test data strategy

---

## Test Environment

### Firebase Backend Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Firebase Emulators | Run Auth + Firestore emulators locally. Isolated, repeatable, free. | ✓ |
| Real Firebase (dev project) | Tests hit actual towlink-71a59 project. Simpler setup but mutates real data. | |
| You decide | Claude picks best approach | |

**User's choice:** Firebase Emulators
**Notes:** Previous emulator setup attempt exists but is broken. Needs diagnosis and fix as part of this phase.

### Data Seeding Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Self-seeding | Each test creates accounts/data it needs, cleans up after. | ✓ |
| Pre-seeded fixture data | Setup script populates before tests run. Tests assume data exists. | |
| You decide | Claude picks | |

**User's choice:** Self-seeding

### Emulator Configuration

| Option | Description | Selected |
|--------|-------------|----------|
| Environment variable flag | Set USE_FIREBASE_EMULATOR=true in .env.test | |
| Separate Expo config | Create app.config.test.js pointing at emulators | |
| You decide | Claude picks simplest approach | ✓ |

**User's choice:** You decide (Claude's discretion)

### Emulator Status

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, already set up | firebase emulators:start works | |
| Firebase CLI installed, no emulator config | Have CLI but haven't configured emulators | |
| Not sure | Don't know if set up | |

**User's choice:** (Other) About a month ago tried to set them up to test a feature. It failed. Code might still be there but is not working.

---

## Flow Coverage

### Commuter Flow Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full happy path | Sign up -> submit request -> searching -> driver assigned -> trip updates | |
| Happy path + error cases | Happy path PLUS no drivers available, invalid location, network errors | ✓ |
| Request submission only | Sign up -> submit request -> confirm in Firestore | |

**User's choice:** Happy path + error cases

### Driver Flow Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Accept and complete trip | Login -> receive job -> accept -> advance stages -> completed | |
| Accept + decline scenarios | Full lifecycle PLUS decline and re-assignment path | ✓ |
| Login and receive job only | Login -> see assigned job on dashboard | |

**User's choice:** Accept + decline scenarios

### Multi-device vs Separate

| Option | Description | Selected |
|--------|-------------|----------|
| Separate flows | Commuter and driver run independently. Driver seeds own data. | ✓ |
| Combined E2E flow | One test orchestrates both commuter and driver devices. | |
| You decide | Claude picks | |

**User's choice:** Separate flows

### Admin Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Commuter + driver only | Phase 3 criteria only mention these two. Admin in Phase 6. | |
| Include basic admin flow | Add simple admin test: login -> Jobs tab -> Drivers tab. | ✓ |

**User's choice:** Include basic admin flow

---

## Device Targets

### Platform

| Option | Description | Selected |
|--------|-------------|----------|
| iOS Simulator only | Fastest path on macOS. Android added later. | ✓ |
| Both iOS + Android | More coverage but doubles setup work. | |
| Android emulator only | Target Android. | |

**User's choice:** iOS Simulator only

### CI Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Local only for now | Run maestro test from terminal. CI deferred to Phase 6. | ✓ |
| GitHub Actions CI | Run tests on every PR. Significant setup effort. | |
| You decide | Claude picks | |

**User's choice:** Local only for now

### Build Type

| Option | Description | Selected |
|--------|-------------|----------|
| Using Expo Go | Currently using Expo Go. Need to set up dev build for Maestro. | ✓ |
| Dev build exists | Already have expo-dev-client configured. | |
| Not sure | Don't know which I'm using. | |

**User's choice:** Using Expo Go (dev build setup needed)

---

## Test Data Strategy

### Account Creation

| Option | Description | Selected |
|--------|-------------|----------|
| Emulator auto-seed script | Seed script creates deterministic test users + company before tests run. | ✓ |
| Tests create accounts via UI | Each flow signs up through actual screens. More realistic but slower. | |
| You decide | Claude picks | |

**User's choice:** Emulator auto-seed script

### Seed Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full state seeding | Company + admin + driver + commuter + pre-created assigned request. | ✓ |
| Users only, flows create data | Seed only accounts + company. Flows create requests via UI. | |
| You decide | Claude picks | |

**User's choice:** Full state seeding

### State Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Emulator reset | Restart emulators between runs. Fresh state, re-seed each time. | ✓ |
| Cleanup script | Delete test data from collections after each run. | |
| You decide | Claude picks | |

**User's choice:** Emulator reset

---

## Claude's Discretion

- Exact Maestro YAML flow structure and `.maestro/` file organization
- Firebase emulator connection mechanism (env var approach)
- Expo dev build configuration (EAS vs local build)
- Seed script implementation details
- Maestro `runFlow` usage for shared setup steps

## Deferred Ideas

- Android emulator targets -- add after iOS tests stable
- GitHub Actions CI -- Phase 6
- Combined multi-device flow -- future enhancement
- Maestro cloud for parallel runs -- post-MVP
