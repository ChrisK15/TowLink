# Roadmap: TowLink

## Overview

This milestone (v1.0 Company-Based Dispatch Pivot) replaces the independent driver marketplace with a B2B company dispatch model. Tow yards register as companies, admins manage their driver fleet, and incoming commuter requests are auto-routed to the nearest affiliated tow yard with fair in-company job distribution. The milestone also wires up push notifications, locks down role-based Firestore security rules, and ships an E2E test suite — delivering a stable, deployable dispatch platform ready for real users.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Companies & Admin** - Establish the company entity, admin dashboard, and company-linked driver auth that the entire dispatch model depends on (completed 2026-03-16)
- [ ] **Phase 2: Company-Based Dispatch** - Replace individual driver matching with nearest-company routing and fair in-company job assignment
- [x] **Phase 3: Firebase Emulator Infrastructure** - Set up Firebase emulators, emulator connection in app, and deterministic seed script for local development and testing (completed 2026-03-21)
- [ ] **Phase 4: Driver Flow & Maps** - Complete the driver job execution flow and map/location UX for active trips
- [ ] **Phase 5: Push Notifications** - Configure EAS builds and implement push notifications for drivers and commuters
- [ ] **Phase 6: Security, Reliability & Testing** - Harden Firestore rules, add loading/error states, fix startup flicker, and ship E2E test coverage
- [x] **Phase 7: After-Trip Completion Screen** - When a trip is completed, both driver and commuter see a trip summary/completion screen (completed 2026-03-24)

## Phase Details

### Phase 1: Companies & Admin
**Goal**: Tow yard admins can register their company and manage their driver roster; drivers authenticate via company email and are automatically linked to their tow yard
**Depends on**: Nothing (first phase)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, AUTH-01
**Success Criteria** (what must be TRUE):
  1. An admin can register a new tow yard company with name, address, and service area and see it persisted in Firestore
  2. An admin can add a driver to their company by entering the driver's company email address, and that driver account is linked to the company
  3. An admin can deactivate a driver so they no longer appear as available for dispatch
  4. An admin dashboard shows all active jobs and their statuses updating in real-time
  5. A driver who logs in with their company-issued email is automatically associated with the correct tow yard — no manual company selection required
**Plans**: 7 plans

Plans:
- [x] 01-01-PLAN.md — Data layer: Company type + Firestore company service (6 functions)
- [x] 01-02-PLAN.md — Auth extension: admin role + companyId in AuthContext + root layout routing
- [x] 01-03-PLAN.md — Driver signup: signUpDriverWithEmail + pre-authorization email check
- [x] 01-04-PLAN.md — Realtime hooks + admin route group scaffold (stubs for /(admin))
- [x] 01-05-PLAN.md — Admin Jobs tab: real-time FlatList with status badges
- [x] 01-06-PLAN.md — Admin Drivers tab: roster + swipe-to-deactivate + Add Driver sheet
- [x] 01-07-PLAN.md — Human verify: all 6 Phase 1 manual flows

### Phase 2: Company-Based Dispatch
**Goal**: Commuter requests are automatically routed to the nearest affiliated tow yard and fairly distributed to an available driver within that company
**Depends on**: Phase 1
**Requirements**: DISP-01, DISP-02, DISP-03
**Success Criteria** (what must be TRUE):
  1. When a commuter submits a tow request, the system routes it to the geographically nearest affiliated tow yard without any manual dispatcher action
  2. Within the matched company, the job is assigned to an available driver using a fair distribution algorithm — no single driver always gets first pick
  3. If the assigned driver declines, the job is immediately re-assigned to the next available driver in the same company without any commuter action
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — App-side data model + driver init fix + trip companyId propagation + FindingDriverModal no_drivers handler
- [x] 02-02-PLAN.md — Cloud Functions rewrite: findNearestCompanies + findFairDriver + dispatch engine + Jest tests
- [x] 02-03-PLAN.md — Deploy Cloud Functions + human verification of all 3 dispatch flows

### Phase 3: Firebase Emulator Infrastructure
**Goal**: Set up Firebase emulators with Auth+Firestore+Functions, connect the app to emulators via env var, and create a deterministic seed script for local development and testing
**Depends on**: Phase 2
**Requirements**: TEST-01 (partial — emulator infra only; Maestro E2E dropped due to Expo dev client friction)
**Success Criteria** (what must be TRUE):
  1. Firebase emulators start with Auth, Firestore, and Functions without errors
  2. App connects to emulators when EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
  3. Seed script creates deterministic test users, company, and request data
  4. testID props on interactive elements for future testing use
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Firebase emulator fix + emulator connection + dev build config + seed script
- [x] 03-02-PLAN.md — testID props on screens + onboarding testIDs (Maestro flows created then removed)

### Phase 4: Driver Flow & Maps
**Goal**: Drivers can execute the full job lifecycle from acceptance to completion, with live map navigation and real-time commuter visibility throughout the trip
**Depends on**: Phase 3
**Requirements**: DRVR-01, DRVR-02, DRVR-03, DRVR-04, MAP-01, MAP-02, MAP-03
**Success Criteria** (what must be TRUE):
  1. A driver receives an assigned job and can accept or decline it from the driver dashboard
  2. A driver navigating to a job sees map directions to the commuter's pickup location
  3. A driver can advance the trip through all stages (en route → arrived → in progress → completed) with each tap updating the commuter's view in real-time
  4. A driver who accepted a job can cancel it before the trip starts, returning the job to the dispatch queue
  5. A commuter on the active trip screen sees the driver's live location on the map plus a route polyline and ETA once a driver is assigned
  6. Location permission prompts appear gracefully on both iOS and Android and handle denial without crashing
**Plans**: 4 plans

Plans:
- [x] 04-01-PLAN.md — Directions API service + useDriverLocation hook + location permission UX
- [x] 04-02-PLAN.md — Driver screen: InstructionCard + route polyline + live location watcher + cancel/open-in-maps
- [x] 04-03-PLAN.md — Commuter screen: DriverMarker + route polyline + live ETA
- [x] 04-04-PLAN.md — Seed data extension + human verification of all Phase 4 flows

### Phase 5: Push Notifications
**Goal**: Drivers and commuters receive timely push notifications for key dispatch events, reliably testable on physical devices via EAS builds
**Depends on**: Phase 4
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06
**Success Criteria** (what must be TRUE):
  1. An EAS development build runs on a physical iOS or Android device and push notifications can be triggered and received
  2. On every app launch the device's push token is registered and written to the user's Firestore document
  3. A driver receives a push notification when a new tow request is assigned to them
  4. A commuter receives a push notification when a driver accepts their request and again when the driver arrives on scene
  5. Tapping a push notification from outside the app opens the app and navigates directly to the relevant job or request screen
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Security, Reliability & Testing
**Goal**: The app is hardened with role-based Firestore rules, consistent loading/error states, and verified end-to-end on real devices via an automated test suite
**Depends on**: Phase 5
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, TEST-01
**Success Criteria** (what must be TRUE):
  1. Firestore security rules enforce that only admins can write company data, only drivers can write their own status and location, and only commuters can create requests — rule violations are rejected
  2. Every screen that triggers a Firebase operation shows a loading indicator while the operation is pending
  3. When a Firebase operation fails, the user sees a readable error message rather than a raw exception or a silent failure
  4. Authenticated users opening the app are routed directly to their correct dashboard without the startup route-flicker bug
  5. Firebase emulators are available for local testing of dispatch flows without hitting production
**Plans**: 4 plans

Plans:
- [ ] 06-01-PLAN.md — Jest + rules-unit-testing infra + Firestore security rules tests for all 6 collections
- [x] 06-02-PLAN.md — LoadingOverlay, ErrorBoundary components + splash screen hold + Toast wiring in root layout
- [ ] 06-03-PLAN.md — Alert.alert to Toast migration + LoadingOverlay migration + MapErrorBoundary wrapping across all screens
- [ ] 06-04-PLAN.md — Emulator seed expansion + human verification of all Phase 6 requirements

### Phase 7: After-Trip Completion Screen
**Goal**: When a trip is completed, both driver and commuter see a trip summary/completion screen instead of returning to home immediately
**Depends on**: Phase 4
**Requirements**: TRIP-01, TRIP-02, TRIP-03
**Success Criteria** (what must be TRUE):
  1. After a driver marks a trip as completed, the driver sees a trip summary screen with key details
  2. After a trip is completed, the commuter sees a trip summary screen with key details
  3. Both screens have a clear action to return to the home/dashboard state
**Plans**: 1 plan

Plans:
- [x] 07-01-PLAN.md — TripCompletionScreen component + driver/commuter screen integration with deferred state clear

## Backlog

### Phase 999.1: Expandable Turn-by-Turn Directions (BACKLOG)

**Goal:** Tap the InstructionCard banner during an active trip to expand a full scrollable list of turn-by-turn directions
**Requirements:** TBD
**Plans:** 1/4 plans executed

Plans:
- [ ] TBD (promote with /gsd:review-backlog when ready)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Companies & Admin | 7/7 | Complete | 2026-03-16 |
| 2. Company-Based Dispatch | 3/3 | Complete | 2026-03-20 |
| 3. Maestro E2E Testing | 2/2 | Complete   | 2026-03-21 |
| 4. Driver Flow & Maps | 3/4 | In Progress|  |
| 5. Push Notifications | 0/TBD | Not started | - |
| 6. Security, Reliability & Testing | 1/4 | In Progress|  |
| 7. After-Trip Completion Screen | 1/1 | Complete   | 2026-03-24 |
