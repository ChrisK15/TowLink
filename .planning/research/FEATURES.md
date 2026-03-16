# Features Research: TowLink MVP Additions

**Research Date:** 2026-03-13
**Scope:** Remaining features needed for a production MVP on-demand towing app

---

## Table Stakes (Must Have — Users Leave Without These)

### Payments
- **Fare displayed before confirmation** — commuter must see the price before requesting; hiding it until payment destroys trust
- **In-app payment collection (Stripe)** — no cash, no invoice-later; payment must happen at trip completion inside the app
- **Payment receipt** — commuter receives confirmation (email or in-app) after charging
- **Driver earnings visibility** — drivers must see what they earned per job; without this, trust breaks immediately

### Notifications
- **New job alert to driver** — driver must be notified when a request is matched to them; passive polling is insufficient
- **Driver accepted notification to commuter** — commuter is waiting roadside; silence after requesting is anxiety-inducing
- **Driver arrived notification to commuter** — critical UX moment; prevents "where are they?" support requests

### Cancellation
- **Commuter can cancel before driver arrives** — essential; circumstances change
- **Driver can cancel accepted job** — rare but must exist to prevent driver being stuck
- **Clear cancellation state in UI** — both parties must see the job cancelled with reason

### Reliability
- **Graceful offline handling** — commuter may have spotty signal roadside; app must not crash or corrupt state
- **Payment error recovery** — if card declines or network drops mid-payment, user must be able to retry
- **Trip state survives app close/reopen** — commuter must not lose active trip state on phone lock

### Security
- **Firebase Security Rules** — current open rules (`allow read, write: if true`) are a hard blocker for production
- **Payment fields server-only writable** — `finalPrice`, `paymentStatus`, `paymentIntentId` must never be client-writable

---

## Differentiators (Competitive Advantage — Worth Building)

### UX Polish
- **ETA display** — show estimated driver arrival time once accepted (calculated from distance + speed estimate)
- **Fare breakdown** — show base rate + distance + total; builds transparency and trust
- **Driver profile on acceptance** — name, vehicle type (not rating for v1, but identity matters)
- **Trip summary screen** — post-trip view showing distance, fare paid, and duration

### Driver Experience
- **Earnings history** — simple list of completed trips with fare; reinforces driver retention
- **Online/offline with earnings summary** — show shift earnings when going offline
- **Accept/decline timer** — show countdown on job offer; prevents indefinite pending state

---

## Anti-Features (Do NOT Build for v1)

| Feature | Reason to Defer |
|---------|----------------|
| In-app chat between commuter/driver | High complexity, low value when phone call/number sharing works |
| Ratings and reviews | Requires moderation, feedback loop; deferred post-launch |
| Surge pricing / dynamic rates | Algorithmic complexity and trust issues; fixed distance-based rate is sufficient |
| OAuth login (Google/Apple) | Email/password sufficient for capstone; OAuth adds provisioning complexity |
| Scheduled/future tows | Real-time dispatch is the core model; scheduling is a separate product |
| Multiple simultaneous trips per driver | Out of scope by design; one job at a time for v1 |
| Admin dashboard | Manual Firebase console is sufficient for capstone scale |
| Refunds | Edge case; handle manually for capstone, build later |

---

## Feature Dependencies

```
Fare display (no dependencies — pure client math)
    ↓
Stripe payment collection
    ↓
Payment receipt (email via Stripe, or in-app summary)
    ↓
Driver payout / earnings visibility

Notification permission request (must happen before any notification feature)
    ↓
Driver job alert → Commuter acceptance alert → Commuter arrival alert
    ↓
Notification tap → deep link to correct screen

Firebase Security Rules (blocks production deploy — no functional dependency)
```

---

## Implementation Ordering Recommendation

**Tier 1 (blocking — build first):**
1. Distance-based fare calculation + display
2. Stripe payment collection (PaymentIntent → PaymentSheet)
3. Driver job alert notification
4. Commuter acceptance + arrival notifications
5. Firebase Security Rules for payment fields

**Tier 2 (important but not blocking):**
6. Cancellation flow for both parties
7. Payment receipt / trip summary screen
8. Driver earnings visibility
9. Offline resilience / error recovery

**Tier 3 (polish — build if time allows):**
10. ETA display on active trip
11. Fare breakdown UI
12. Driver earnings history
13. Accept/decline timer on job offer

---

*Features research: 2026-03-13*
