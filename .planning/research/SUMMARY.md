# Research Summary: TowLink MVP

**Synthesized:** 2026-03-13
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Stack Recommendations

**Stripe:** `@stripe/stripe-react-native` with PaymentSheet UX. Install via `npx expo install @stripe/stripe-react-native`. New Architecture compatible (v0.35+). Driver payouts via Stripe Connect Express.

**Push Notifications:** `expo-notifications` + `expo-device`. Use raw FCM token path (not Expo Push Service) to stay within Firebase. Store tokens in Firestore; send from Cloud Functions via `expo-server-sdk`. **Do NOT use `@react-native-firebase/messaging`** — conflicts with existing Firebase JS SDK v12.

**Firebase Cloud Functions:** Required for all Stripe operations (secret key boundary). Use Functions v2 (TypeScript). Needed for: `createPaymentIntent`, `capturePayment`, `payoutDriver`, `onRequestClaimed` (notify driver), `onTripStatusChange` (notify commuter).

**Critical constraint:** `expo-notifications` requires an **EAS build** — Expo Go cannot test push notifications. This must be set up before notification work begins.

---

## Table Stakes Features (Remaining for MVP)

| Feature | Status |
|---------|--------|
| Distance-based fare display before request | Not built |
| Stripe in-app payment collection | Not built |
| Driver push notification (new job) | Not built |
| Commuter push notification (accepted / arrived) | Not built |
| Firebase Security Rules (lock payment fields) | Not built — CRITICAL |
| Payment receipt / trip summary | Not built |
| Cancellation flow (commuter + driver) | Not built |

---

## Watch Out For: Critical Issues in Existing Code

These are real bugs found by direct codebase inspection — address before Stripe work:

1. **`finalPrice` is never set** (`acceptClaimedRequest` sets it to `null`) — payment will charge null or wrong amount
2. **`acceptRequest()` is non-transactional** — double Trip creation risk if both code paths are reachable; audit and remove or fix
3. **Firestore rules are fully open** (`allow read, write: if true`) — with payments live, any user can write `finalPrice: 1` before triggering a charge

---

## Architecture: How Payments + Notifications Fit In

**Payments flow:**
- Fare calculated client-side (pure math, existing `geofire-common`)
- PaymentIntent created server-side (Cloud Function, secret key)
- Client presents native PaymentSheet (Stripe handles PCI)
- Payment confirmed → CF writes `paymentStatus = 'paid'` to Trip doc
- Payout to driver via Stripe Connect triggered by CF on `paymentStatus = 'paid'`

**Notifications flow:**
- Push token registered on every app launch → stored in `users/{id}.expoPushToken`
- Firestore triggers in Cloud Functions observe existing state machine writes → send push via `expo-server-sdk`
- No changes to existing `firestore.ts` state machines needed

**Key rule:** If it needs the Stripe secret key or another user's push token, it lives in Cloud Functions.

---

## Recommended Phase Structure

Based on research, the remaining MVP work naturally breaks into **3 phases**:

**Phase A — Payments**
Fix `finalPrice` bug → security rules for payment fields → Cloud Functions setup → fare display → Stripe PaymentSheet → driver payout

**Phase B — Notifications**
EAS build setup → push token registration → driver job alert → commuter status notifications → notification tap deep linking

**Phase C — Hardening**
Cancellation flows → payment error recovery → trip summary screen → offline resilience → full security rules audit → end-to-end device testing

---

## Key Decisions Recommended

| Decision | Recommendation |
|----------|---------------|
| Pricing distance | Use straight-line × 1.4 factor for capstone; document limitation; plan Google Distance Matrix for post-capstone |
| Stripe Connect for capstone | Test mode with test connected account IDs; real onboarding deferred |
| Stripe webhooks | Document as known gap for capstone; implement in Phase C hardening |
| Non-transactional `acceptRequest()` | Audit and delete if unused; if needed, migrate to `runTransaction` |

---

*Research synthesized: 2026-03-13*
