# Requirements: TowLink

**Defined:** 2026-03-13
**Core Value:** A stranded commuter can get a tow truck dispatched to their exact GPS location within minutes, with live tracking until the driver arrives.

---

## v1 Requirements

Requirements for MVP release. Each maps to a roadmap phase.

### Payments

- [ ] **PAY-01**: User sees distance-based fare estimate before confirming tow request
- [ ] **PAY-02**: Stripe SDK integrated and `<StripeProvider>` configured in app root
- [ ] **PAY-03**: Cloud Function creates PaymentIntent server-side (secret key never on client)
- [ ] **PAY-04**: Commuter can pay at trip completion using Stripe PaymentSheet (native card UI)
- [ ] **PAY-05**: Payment receipt / trip summary shown to commuter after successful payment
- [ ] **PAY-06**: Driver sees earnings amount for each completed trip
- [ ] **PAY-07**: Payment errors (card decline, network failure) show user-friendly retry flow
- [ ] **PAY-08**: `finalPrice` is set correctly on Trip at completion and used as the charge amount

### Notifications

- [ ] **NOTF-01**: EAS development build configured for push notification testing (replaces Expo Go)
- [ ] **NOTF-02**: Push token registered on every app launch and stored to Firestore user doc
- [ ] **NOTF-03**: Driver receives push notification when matched to a new tow request
- [ ] **NOTF-04**: Commuter receives push notification when driver accepts their request
- [ ] **NOTF-05**: Commuter receives push notification when driver arrives on scene
- [ ] **NOTF-06**: Tapping a push notification navigates to the correct in-app screen

### Driver Flow

- [ ] **DRVR-01**: Driver sees available pending requests on map (TOW-17)
- [ ] **DRVR-02**: Driver can navigate to customer location with map directions (TOW-36)
- [ ] **DRVR-03**: Driver has clear UI buttons to advance trip status (en route → arrived → in progress → complete) (TOW-37)
- [ ] **DRVR-04**: Driver can cancel an accepted job before trip starts
- [ ] **DRVR-05**: Driver account setup screen captures vehicle information (TOW-75)
- [ ] **DRVR-06**: Driver completes trip and payment flow is triggered (TOW-40)

### Maps & Location

- [ ] **MAP-01**: Commuter map screen fully functional with current location display (TOW-46)
- [ ] **MAP-02**: Real-time driver location tracked and updated on both commuter and driver maps (TOW-80)
- [ ] **MAP-03**: Route polyline displayed on map during active trip (TOW-38)
- [ ] **MAP-04**: ETA calculated and shown to commuter after driver accepts (TOW-42)
- [ ] **MAP-05**: Location permissions handled gracefully on iOS and Android (TOW-24)

### Commuter Flow

- [ ] **COMM-01**: Commuter can cancel a request before driver arrives (TOW-39)
- [ ] **COMM-02**: Vehicle details autofilled from user profile on request form (TOW-82)

### Security & Reliability

- [ ] **SEC-01**: Firebase Security Rules lock `finalPrice`, `paymentStatus`, `paymentIntentId`, `driverPayoutStatus` as server-only writable (TOW-55/58/59)
- [ ] **SEC-02**: Firebase Security Rules: user documents readable and writable only by owner
- [ ] **SEC-03**: Firebase Security Rules: trip documents readable only by commuter and assigned driver
- [ ] **SEC-04**: Loading states shown throughout all async operations (TOW-35)
- [ ] **SEC-05**: Error handling with user-friendly messages across all Firebase and Stripe operations (TOW-34)
- [ ] **SEC-06**: Fix route flickering on app startup for authenticated users (TOW-83)

### Testing

- [ ] **TEST-01**: Maestro E2E test suite configured for core user flows (TOW-81)

---

## v2 Requirements

Acknowledged but deferred past MVP.

### Payments

- **PAY-V2-01**: Stripe Connect Express driver onboarding flow (real account setup, not test mode)
- **PAY-V2-02**: Driver payout dashboard showing earnings history
- **PAY-V2-03**: Stripe webhook handler for payment event reliability

### Maps

- **MAP-V2-01**: Google Distance Matrix API for road distance (replaces straight-line × factor)

### Reliability

- **REL-V2-01**: Performance optimization audit (TOW-43)

### Social

- **SOC-V2-01**: Ratings and reviews after trip completion
- **SOC-V2-02**: Driver background check integration

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| In-app chat between commuter and driver | High complexity; phone call via shared number is sufficient for v1 |
| Surge/dynamic pricing | Algorithmic complexity; distance-based fixed rate sufficient |
| OAuth login (Google, Apple) | Email/password sufficient for capstone scope |
| Scheduled/future tows | Real-time dispatch is the core model; scheduling is a separate product |
| Multiple simultaneous trips per driver | Single-job model for v1 |
| Admin dashboard | Firebase console sufficient at capstone scale |
| Web app | Mobile-first; web is not planned |
| Refunds | Handle manually; build automation later |

---

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAY-01 | Phase 1 — Payments | Pending |
| PAY-02 | Phase 1 — Payments | Pending |
| PAY-03 | Phase 1 — Payments | Pending |
| PAY-04 | Phase 1 — Payments | Pending |
| PAY-05 | Phase 1 — Payments | Pending |
| PAY-06 | Phase 1 — Payments | Pending |
| PAY-07 | Phase 1 — Payments | Pending |
| PAY-08 | Phase 1 — Payments | Pending |
| SEC-01 | Phase 1 — Payments | Pending |
| SEC-02 | Phase 1 — Payments | Pending |
| SEC-03 | Phase 1 — Payments | Pending |
| NOTF-01 | Phase 2 — Notifications | Pending |
| NOTF-02 | Phase 2 — Notifications | Pending |
| NOTF-03 | Phase 2 — Notifications | Pending |
| NOTF-04 | Phase 2 — Notifications | Pending |
| NOTF-05 | Phase 2 — Notifications | Pending |
| NOTF-06 | Phase 2 — Notifications | Pending |
| DRVR-01 | Phase 3 — Driver Flow & Maps | Pending |
| DRVR-02 | Phase 3 — Driver Flow & Maps | Pending |
| DRVR-03 | Phase 3 — Driver Flow & Maps | Pending |
| DRVR-04 | Phase 3 — Driver Flow & Maps | Pending |
| DRVR-05 | Phase 3 — Driver Flow & Maps | Pending |
| DRVR-06 | Phase 3 — Driver Flow & Maps | Pending |
| MAP-01 | Phase 3 — Driver Flow & Maps | Pending |
| MAP-02 | Phase 3 — Driver Flow & Maps | Pending |
| MAP-03 | Phase 3 — Driver Flow & Maps | Pending |
| MAP-04 | Phase 3 — Driver Flow & Maps | Pending |
| MAP-05 | Phase 3 — Driver Flow & Maps | Pending |
| COMM-01 | Phase 3 — Driver Flow & Maps | Pending |
| COMM-02 | Phase 3 — Driver Flow & Maps | Pending |
| SEC-04 | Phase 4 — Hardening | Pending |
| SEC-05 | Phase 4 — Hardening | Pending |
| SEC-06 | Phase 4 — Hardening | Pending |
| TEST-01 | Phase 4 — Hardening | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---

*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after roadmap creation*
