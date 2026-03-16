# TowLink

## What This Is

TowLink is a dual-mode mobile app (React Native + Expo) and B2B dispatch platform that connects stranded commuters with affiliated tow yard fleets. Commuters submit a tow request via the native app; the system routes to the nearest affiliated tow yard and automatically dispatches the job to an available driver using a fair distribution algorithm. Tow yard admins manage their fleet and monitor jobs in real-time through an admin dashboard — eliminating the need for a manual dispatcher.

## Core Value

A stranded commuter can get a tow truck from a local affiliated tow yard dispatched to their exact GPS location in minutes, without the tow yard needing a manual dispatcher.

## Current Milestone: v1.0 Company-Based Dispatch Pivot

**Goal:** Replace independent driver matching with company-based dispatch so tow yards can use TowLink to automate their fleet dispatching

**Target features:**
- Company registration, admin dashboard, driver management
- Nearest-company routing with fair in-company job distribution
- Driver company-linked authentication (company email)
- Push notifications for driver and commuter
- Role-based Firestore security rules
- E2E test suite

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ User can sign up and log in with email/password — existing
- ✓ User role (commuter vs driver) persists and routes to correct app flow — existing
- ✓ Commuter can create a tow request with pickup/dropoff location and service type — existing
- ✓ Request progresses through state machine: searching → claimed → accepted → trip — existing
- ✓ Trip progresses through state machine: en_route → arrived → in_progress → completed — existing
- ✓ Driver can toggle online/offline availability — existing
- ✓ Driver receives proximity-matched request and can accept or decline — existing
- ✓ Declined requests re-enter matching pool — existing
- ✓ Commuter sees live driver location on map while trip is active — existing
- ✓ Both commuter and driver receive status change updates in real-time — existing
- ✓ Geohashing used for spatial driver queries — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Company registration and admin dashboard for tow yards
- [ ] Driver-company authentication (drivers log in with company-issued email)
- [ ] Incoming requests auto-routed to nearest affiliated tow yard
- [ ] Fair job distribution algorithm within matched company
- [ ] Push notifications for driver (new job) and commuter (accepted, arrived)
- [ ] Role-based Firestore security rules (admin / driver / commuter)
- [ ] End-to-end flow stable and tested on real iOS and Android devices

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Real-time chat between commuter and driver — phone call sufficient for v1
- In-app ratings and reviews — deferred post-launch
- Driver background check integration — manual process for launch
- Multiple active trips per driver — single-job model for v1
- Web app as primary interface — mobile-first, web deferred indefinitely
- Stripe payment integration — deferred to v2; validate dispatch model first
- Web fallback request form — mobile web entry point deferred to v2
- Source-tagging / referral locking — tow yard-initiated web form flow deferred to v2
- Surge/dynamic pricing — straightforward rate sufficient; algorithmic complexity not needed
- Admin earnings analytics dashboard — Firebase console sufficient at capstone scale

## Context

- University capstone project targeting a deployable MVP with real users
- **Pivoted 2026-03-15**: from independent driver marketplace to B2B company-based dispatch model; tow yards are now the primary customer
- Firebase is fully integrated: Auth, Firestore (with real-time listeners), Storage
- Google Maps API integrated for commuter and driver map screens
- Payments deferred to v2 — no Stripe integration in this milestone
- Push notifications not yet implemented (Expo Push Notifications or FCM)
- New React Native Architecture enabled (`newArchEnabled: true`)
- Firestore transactions used for race-condition-safe request claiming
- Current data model has no "company" entity — new `companies` collection needed
- Existing driver auth is standalone — needs company linkage on signup/login
- Existing geohash-based matching finds nearest individual driver — must be replaced with company-based routing

## Constraints

- **Tech stack**: React Native + Expo — locked in, cross-platform mobile only
- **Backend**: Firebase only — no custom server; all logic in Firestore + Cloud Functions
- **Auth**: Firebase Auth with email/password — no OAuth for v1
- **Maps**: Google Maps SDK — locked in via existing integration
- **Platform**: iOS 13+ and Android 6.0+ — Expo SDK 54 minimum requirements
- **Payments**: Deferred to v2 — no Stripe work in this milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pivot to B2B company-based dispatch | Independent driver model not scalable; tow yards have fleets and need dispatch automation | — Pending |
| Defer Stripe payments to v2 | Focus on company/dispatch operations first; validate with tow yards before payment complexity | — Pending |
| Driver signs up via company email (no self-registration) | Admin controls who has access; company email ties driver to their tow yard automatically | — Pending |
| Nearest-company routing (not individual driver proximity) | Tow yards manage their own drivers; system routes to company first, fair distribution within company | — Pending |
| Single active trip per driver | Simplifies matching, appropriate for v1 scope | — Pending |

---
*Last updated: 2026-03-15 after B2B dispatch pivot (v1.0 milestone start)*
