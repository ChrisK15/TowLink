# Requirements: TowLink

**Defined:** 2026-03-13
**Revised:** 2026-03-15 — B2B dispatch pivot (company-based model replaces independent driver marketplace)
**Core Value:** A stranded commuter can get a tow truck from a local affiliated tow yard dispatched to their exact GPS location in minutes, without the tow yard needing a manual dispatcher.

---

## v1 Requirements

Requirements for MVP release. Each maps to a roadmap phase.

### Companies & Admin

- [x] **COMP-01**: Admin can register a tow yard company (name, address, service area)
- [x] **COMP-02**: Admin can add a driver to their company by registering the driver's company email address (no self-registration for drivers)
- [x] **COMP-03**: Admin can remove or deactivate a driver from their company
- [x] **COMP-04**: Admin can view all active jobs and their statuses in real-time
- [x] **COMP-05**: Admin can view which drivers are currently online

### Authentication

- [x] **AUTH-01**: Driver logs in with their company-issued email address and is automatically associated with their affiliated tow yard

### Dispatch

- [x] **DISP-01**: Incoming commuter request is auto-routed to the nearest affiliated tow yard
- [x] **DISP-02**: Within the matched company, job is assigned to an available driver using a fair distribution algorithm
- [x] **DISP-03**: If the assigned driver declines, job is re-assigned to the next available driver in the same company

### Driver Flow

- [ ] **DRVR-01**: Driver can accept or decline an assigned job
- [ ] **DRVR-02**: Driver can navigate to commuter location using map directions during active trip
- [ ] **DRVR-03**: Driver can advance trip status through all stages (en route → arrived → in progress → completed)
- [ ] **DRVR-04**: Driver can cancel an accepted job before the trip starts

### Maps & Location

- [ ] **MAP-01**: Commuter sees real-time driver location on map during active trip
- [ ] **MAP-02**: Route polyline and ETA are shown on commuter map once a driver is assigned
- [ ] **MAP-03**: Location permissions handled gracefully on iOS and Android

### Notifications

- [ ] **NOTF-01**: EAS development build configured and push notifications testable on physical devices
- [ ] **NOTF-02**: Push token registered on every app launch and stored to Firestore user doc
- [ ] **NOTF-03**: Driver receives push notification when assigned a new tow request
- [ ] **NOTF-04**: Commuter receives push notification when driver accepts their request
- [ ] **NOTF-05**: Commuter receives push notification when driver arrives on scene
- [ ] **NOTF-06**: Tapping a push notification navigates to the correct in-app screen

### Security & Reliability

- [ ] **SEC-01**: Firestore rules enforce role-based access (admin writes company data, drivers write their own data, commuters write requests)
- [ ] **SEC-02**: Loading states shown throughout all async operations
- [ ] **SEC-03**: Error handling with user-friendly messages across all Firebase operations
- [ ] **SEC-04**: Fix route flickering on app startup for authenticated users

### Testing

- [x] **TEST-01**: Maestro E2E test suite covers commuter request and driver dispatch flows

---

## v2 Requirements

Acknowledged but deferred past MVP.

### Payments

- **PAY-01**: User sees distance-based fare estimate before confirming tow request
- **PAY-02**: Stripe SDK integrated and `<StripeProvider>` configured in app root
- **PAY-03**: Cloud Function creates PaymentIntent server-side (secret key never on client)
- **PAY-04**: Commuter can pay at trip completion using Stripe PaymentSheet (native card UI)
- **PAY-05**: Payment receipt / trip summary shown to commuter after successful payment
- **PAY-06**: Driver sees earnings amount for each completed trip
- **PAY-07**: Payment errors (card decline, network failure) show user-friendly retry flow
- **PAY-08**: `finalPrice` is set correctly on Trip at completion and used as the charge amount

### Web & Referral

- **WEB-01**: Mobile web fallback form captures GPS location and service details
- **WEB-02**: Web form includes a prompt to download the native app
- **WEB-03**: Source-tagging locks web form requests to the referring tow yard company

### Commuter

- **COMM-01**: Commuter can cancel a request before driver arrives

### Infrastructure

- **INF-01**: Stripe Connect Express driver onboarding flow (real account setup)
- **INF-02**: Stripe webhook handler for payment event reliability

---

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| In-app chat between commuter and driver | High complexity; phone call sufficient for v1 |
| Surge/dynamic pricing | Algorithmic complexity; straightforward pricing sufficient |
| OAuth login (Google, Apple) | Email/password sufficient for capstone scope |
| Scheduled/future tows | Real-time dispatch is the core model; scheduling is separate product |
| Multiple simultaneous trips per driver | Single-job model for v1 |
| Admin earnings/analytics dashboard | Firebase console sufficient at capstone scale; v2 feature |
| Web app as primary interface | Mobile-first; web deferred indefinitely |
| Refunds | Handle manually; build automation later |
| Driver background check integration | Manual process for launch |

---

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMP-01 | Phase 1 | Complete |
| COMP-02 | Phase 1 | Complete |
| COMP-03 | Phase 1 | Complete |
| COMP-04 | Phase 1 | Complete |
| COMP-05 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| DISP-01 | Phase 2 | Complete |
| DISP-02 | Phase 2 | Complete |
| DISP-03 | Phase 2 | Complete |
| DRVR-01 | Phase 4 | Pending |
| DRVR-02 | Phase 4 | Pending |
| DRVR-03 | Phase 4 | Pending |
| DRVR-04 | Phase 4 | Pending |
| MAP-01 | Phase 4 | Pending |
| MAP-02 | Phase 4 | Pending |
| MAP-03 | Phase 4 | Pending |
| NOTF-01 | Phase 5 | Pending |
| NOTF-02 | Phase 5 | Pending |
| NOTF-03 | Phase 5 | Pending |
| NOTF-04 | Phase 5 | Pending |
| NOTF-05 | Phase 5 | Pending |
| NOTF-06 | Phase 5 | Pending |
| SEC-01 | Phase 6 | Pending |
| SEC-02 | Phase 6 | Pending |
| SEC-03 | Phase 6 | Pending |
| SEC-04 | Phase 6 | Pending |
| TEST-01 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---

*Requirements defined: 2026-03-13*
*Last updated: 2026-03-20 — Fixed TEST-01 traceability (Phase 3, not Phase 5); fixed DRVR/MAP/SEC phase mappings*
