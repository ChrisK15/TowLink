# Roadmap: TowLink

## Overview

TowLink's core dispatch loop is already working. The remaining MVP work covers four delivery boundaries: making payments safe and functional, wiring up push notifications, polishing the driver and map experience, and hardening the app for real-device testing. Each phase leaves the app in a verifiably more complete state than when it started.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Payments** - Fix the finalPrice bug, lock down security rules, and enable end-to-end Stripe payment collection
- [ ] **Phase 2: Notifications** - Set up EAS builds and deliver push alerts to drivers and commuters at the right moments
- [ ] **Phase 3: Driver Flow & Maps** - Complete the driver-side trip UI and polish the maps experience for both roles
- [ ] **Phase 4: Hardening** - Make the app production-stable with loading states, error handling, and an E2E test suite

## Phase Details

### Phase 1: Payments
**Goal**: Commuter can pay for a completed trip via Stripe, driver sees their earnings, and payment fields are safe from client tampering
**Depends on**: Nothing (builds on existing validated core)
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Commuter sees a fare estimate based on trip distance before confirming a request
  2. At trip completion, commuter is presented with a native Stripe PaymentSheet and can successfully pay
  3. After payment, commuter sees a trip summary screen showing total charged
  4. Driver sees the earnings amount on their completed trip
  5. Firestore rules prevent any client from writing to finalPrice, paymentStatus, paymentIntentId, or driverPayoutStatus — only Cloud Functions can write these fields
**Plans**: TBD

### Phase 2: Notifications
**Goal**: Driver receives a push alert when matched to a new job; commuter receives alerts when driver accepts and arrives
**Depends on**: Phase 1
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, NOTF-05, NOTF-06
**Success Criteria** (what must be TRUE):
  1. App runs as an EAS development build (not Expo Go) and push notifications can be tested on a physical device
  2. Driver receives a push notification when a request is matched to them, even with the app backgrounded
  3. Commuter receives a push notification when the driver accepts their request
  4. Commuter receives a push notification when the driver marks themselves as arrived
  5. Tapping any push notification opens the app and navigates to the relevant screen
**Plans**: TBD

### Phase 3: Driver Flow & Maps
**Goal**: Driver can execute a complete trip from job offer to completion with map directions and clear status controls; both map screens are fully polished
**Depends on**: Phase 1
**Requirements**: DRVR-01, DRVR-02, DRVR-03, DRVR-04, DRVR-05, DRVR-06, MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, COMM-01, COMM-02
**Success Criteria** (what must be TRUE):
  1. Driver sees pending requests on the map and can navigate to a customer's location with turn-by-turn directions
  2. Driver can advance trip status through all stages (en route → arrived → in progress → completed) using clearly labelled UI buttons
  3. Driver can cancel an accepted job before the trip starts; commuter is notified and request re-enters the pool
  4. Commuter can cancel a request before the driver arrives; driver is notified and job is removed
  5. Route polyline and ETA are displayed on the commuter map screen once a driver is assigned
**Plans**: TBD

### Phase 4: Hardening
**Goal**: The app is stable, error-tolerant, and verified end-to-end on real iOS and Android devices
**Depends on**: Phases 2 and 3
**Requirements**: SEC-04, SEC-05, SEC-06, TEST-01
**Success Criteria** (what must be TRUE):
  1. Every async operation shows a loading indicator and never leaves the user staring at a frozen screen
  2. Firebase and Stripe errors surface as human-readable messages with a retry path (no raw error codes shown to user)
  3. Authenticated users land directly on their home screen without a route flicker on app startup
  4. Maestro E2E test suite covers commuter request and driver acceptance flows and passes on both iOS and Android
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4
Note: Phase 3 depends only on Phase 1 (not Phase 2) — notifications and driver flow can proceed in parallel if needed.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Payments | 0/? | Not started | - |
| 2. Notifications | 0/? | Not started | - |
| 3. Driver Flow & Maps | 0/? | Not started | - |
| 4. Hardening | 0/? | Not started | - |
