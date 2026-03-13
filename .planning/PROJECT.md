# TowLink

## What This Is

TowLink is a dual-mode mobile app (React Native + Expo) that connects commuters stranded roadside with independent tow truck drivers. Commuters submit a tow request and track their assigned driver in real-time on a live map. Drivers go online, receive proximity-matched job offers, accept or decline, and complete jobs to earn money — paid via Stripe based on trip distance.

## Core Value

A stranded commuter can get a tow truck dispatched to their exact GPS location within minutes, with live tracking until the driver arrives.

## Requirements

### Validated

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

- [ ] Distance-based fare is calculated and shown to commuter before confirming request
- [ ] Commuter pays via Stripe at trip completion
- [ ] Driver receives Stripe payout for completed trips
- [ ] Push notifications sent to driver on new request match
- [ ] Push notifications sent to commuter on driver acceptance and arrival
- [ ] End-to-end flow is stable and tested on real devices (iOS + Android)
- [ ] Production Firebase security rules locked down

### Out of Scope

- Real-time chat between commuter and driver — add later if needed, not core to v1
- In-app ratings and reviews — deferred post-launch
- Driver background check integration — manual process for launch
- Multiple active trips per driver — single-job model for v1
- Web app — mobile-first, web deferred indefinitely

## Context

- University capstone project targeting a deployable MVP with real users
- Firebase is fully integrated: Auth, Firestore (with real-time listeners), Storage
- Google Maps API integrated for commuter and driver map screens
- No Stripe integration yet — payments are the primary remaining gap
- Push notifications not yet implemented (Expo Push Notifications or FCM)
- New React Native Architecture enabled (`newArchEnabled: true`)
- Firestore transactions used for race-condition-safe request claiming

## Constraints

- **Tech stack**: React Native + Expo — locked in, cross-platform mobile only
- **Backend**: Firebase only — no custom server; all logic in Firestore + Cloud Functions
- **Auth**: Firebase Auth with email/password — no OAuth for v1
- **Maps**: Google Maps SDK — locked in via existing integration
- **Payments**: Stripe — chosen for payments; no alternative being considered
- **Platform**: iOS 13+ and Android 6.0+ — Expo SDK 54 minimum requirements

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Proximity-based auto-assignment (not broadcast) | Avoids driver competition, predictable UX | — Pending |
| Driver can accept/decline | Drivers need flexibility; system re-assigns on decline | — Pending |
| Distance-based pricing (not fixed) | Fairer for both parties on variable-length tows | — Pending |
| Stripe for payments | Industry standard, well-documented React Native SDK | — Pending |
| Single active trip per driver | Simplifies matching, appropriate for v1 scope | — Pending |

---
*Last updated: 2026-03-13 after initialization*
