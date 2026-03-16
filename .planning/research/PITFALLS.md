# Pitfalls: TowLink MVP Additions

**Research Date:** 2026-03-13
**Scope:** Common mistakes when adding Stripe + push notifications to Firebase + React Native on-demand app
**Source:** Direct codebase inspection + domain knowledge

---

## Critical: Issues Found in Existing Code

These are real bugs discovered during codebase analysis — not hypothetical risks.

---

### PITFALL-01: `finalPrice` Is Never Set (Payment Will Charge Wrong Amount)

**Severity:** CRITICAL — blocks payment implementation

**What the code does:**
`acceptClaimedRequest()` in `firestore.ts` creates a Trip with `finalPrice: null`. The field is never updated to a real value before the existing code flow ends.

**Risk:**
If a Cloud Function charges `trip.finalPrice`, it charges `null` (or crashes). If it falls back to `estimatedPrice`, it always charges the upfront estimate regardless of actual trip, bypassing the distance-based pricing model.

**Warning signs:** Payment amounts are always identical to the estimate regardless of actual trip.

**Prevention:**
- Define exactly when `finalPrice` is set: either at trip completion (from actual driven path) or at trip creation (from straight-line distance estimate, locked in)
- Set `finalPrice` in the same transaction as trip completion; the Cloud Function reads it; never charge `null`
- Add a guard in `createPaymentIntent` CF: `if (!trip.finalPrice) throw new Error('finalPrice not set')`

**Phase:** Stripe integration — first thing to address before building any payment flow.

---

### PITFALL-02: Non-Transactional `acceptRequest()` Still Exists (Double Trip Creation Risk)

**Severity:** HIGH — race condition vulnerability

**What the code does:**
`acceptClaimedRequest()` correctly uses `runTransaction` to prevent concurrent acceptance. However, an older `acceptRequest()` function (line ~94 in `firestore.ts`) does a bare `updateDoc` + `addDoc` without a transaction.

**Risk:**
If both functions are reachable (e.g., the driver screen calls one path, a background trigger calls another), two Trip documents can be created for the same request. If payment is triggered on Trip creation, this could create double charges.

**Warning signs:** Duplicate Trip documents in Firestore for the same Request.

**Prevention:**
- Audit all call sites of `acceptRequest()` — if it's unused, delete it
- If it's still needed, migrate it to use `runTransaction` with the same guard pattern as `acceptClaimedRequest()`
- Add a Firestore rule or Cloud Function guard: check `request.status !== 'accepted'` before creating a Trip

**Phase:** Stripe integration — audit before wiring payment triggers to Trip creation.

---

### PITFALL-03: Pricing Uses Straight-Line Distance (Road Distance Is 1.3–2x Longer)

**Severity:** MEDIUM — user trust / driver economics

**What the code does:**
`calculateFare()` in `requestCalculations.ts` uses `geofire-common`'s `distanceBetween()`, which computes haversine (straight-line) distance.

**Risk:**
Road distance is typically 1.3x–2x longer than straight-line in urban/suburban areas. Drivers consistently earn less than they expected. Commuters may dispute fares if they see the route was longer.

**Warning signs:** Drivers complain earnings don't reflect actual drive distance.

**Prevention:**
- Use Google Maps Distance Matrix API to get driving distance at request creation
- Store `routeDistanceMiles` on the Request, use it for fare calculation
- Fallback: multiply straight-line distance by a configurable factor (e.g., 1.4) as a simple correction — disclose this to users
- For capstone: document the straight-line limitation, use it knowingly, plan Distance Matrix for post-capstone

**Phase:** Fare calculation — decide approach before implementing Stripe (determines what `finalPrice` is based on).

---

### PITFALL-04: Firestore Security Rules Are Fully Open (Payment Fields Exploitable)

**Severity:** CRITICAL — security vulnerability before production

**What the rules are:**
`allow read, write: if true` — any unauthenticated user can write any field to any document.

**Risk with payments:**
A user writes `finalPrice: 1` to their own trip document before triggering payment. Cloud Function charges $0.01 for a $100 tow. Or a malicious user writes to another user's trip document entirely.

**Warning signs:** This isn't a warning-sign scenario — it's guaranteed exploitation once the app is public.

**Prevention:**
- Lock payment fields immediately: `finalPrice`, `paymentStatus`, `paymentIntentId`, `driverPayoutStatus` must never be writable by clients
- Use Cloud Functions Admin SDK for all payment field writes (Admin SDK bypasses rules — use this intentionally)
- Minimum rules to add before any payment testing: owner-only writes on `users/`, participant-only reads/writes on `trips/` with payment field exclusion
- Full rules audit before production

**Phase:** Security rules — implement before any Stripe testing, not after.

---

### PITFALL-05: No Webhook Handler Exists (Payment Status Can Be Spoofed)

**Severity:** HIGH for production, LOW for capstone test mode

**What exists:**
Confirmed by `INTEGRATIONS.md`: no webhook endpoints in the current codebase.

**Risk:**
Without webhooks, the app relies entirely on client-side payment confirmation. A client that never calls `capturePayment` leaves the PaymentIntent in an incomplete state. Stripe may not reflect the true payment outcome. Disputed payments and refunds have no server-side handling.

**Warning signs:** Payment shows "completed" in the app but Stripe dashboard shows "requires_capture" or "canceled".

**Prevention:**
- For capstone: Use `PaymentSheet` which auto-confirms on client — reduces (but doesn't eliminate) the need for webhooks
- For production: Add a Stripe webhook Cloud Function endpoint (`onStripeWebhook`) that handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `transfer.created`
- Store webhook secret in Cloud Functions environment variables; verify `stripe.webhooks.constructEvent()` signature on every call
- Mark trips `paymentStatus = 'failed'` on webhook failure — don't leave them ambiguous

**Phase:** Stripe integration — document as known gap for capstone, plan webhook for production hardening phase.

---

## Notification Pitfalls

### PITFALL-06: Expo Go Cannot Test Push Notifications (EAS Build Required)

**Severity:** HIGH — blocks notification development workflow

**What happens:**
`expo-notifications` with APNs/FCM does not work in Expo Go. The token registration succeeds but delivery silently fails.

**Warning signs:** No errors, but notifications never arrive during Expo Go testing.

**Prevention:**
- Create an EAS development build before starting any notification work
- `eas build --profile development --platform ios` (and/or android)
- Add `eas.json` with a development profile that has `developmentClient: true`
- This is a one-time setup cost, not ongoing

**Phase:** Notifications — first step, before writing any notification code.

---

### PITFALL-07: Push Token Stored Once at Signup Silently Fails

**Severity:** MEDIUM — affects notification reliability over time

**What happens:**
iOS tokens rotate on device reinstall and periodically on token refresh events. Android tokens rotate on data clear and app reinstall.

**Warning signs:** Notifications work after fresh install but stop working for some users after weeks.

**Prevention:**
- Call `getExpoPushTokenAsync()` on every app launch, not just at signup
- Register `addPushTokenListener` callback → update Firestore when token changes
- Structure the token registration in `services/notifications/push.ts` called from `AuthProvider` after login

**Phase:** Notifications — build the right way from the start.

---

### PITFALL-08: No Error Boundaries Around Payment UI (Crashes on PaymentSheet Failure)

**Severity:** MEDIUM — UX reliability

**What exists:**
`CONCERNS.md` confirms no error boundaries exist anywhere in the app. `@stripe/stripe-react-native`'s `presentPaymentSheet()` can throw on network errors, card decline, or 3DS failure.

**Risk:**
An uncaught payment error crashes the screen, leaving the trip in an ambiguous state and the commuter confused.

**Warning signs:** Sentry/crash reports with unhandled promise rejections in the payment flow.

**Prevention:**
- Wrap `presentPaymentSheet()` in try/catch with specific error type handling
- Show user-friendly messages for declines (`PaymentSheetError.Canceled`, `PaymentSheetError.Failed`, `PaymentSheetError.Timeout`)
- Log the error to console (and eventually Sentry) before showing the user message
- Do NOT mark trip as paid until Cloud Function confirms — client-side confirmation is not the source of truth

**Phase:** Stripe integration — handle from the start, don't add later.

---

## Matching & Proximity Pitfalls

### PITFALL-09: Geohash Precision Mismatch Can Miss Nearby Drivers

**Severity:** MEDIUM — matching reliability

**What happens:**
Geohash queries use a precision level that determines the search radius. Too fine = misses drivers just outside the cell. Too coarse = includes drivers far away and wastes query bandwidth.

**Warning signs:** Drivers physically nearby show up as unavailable; requests go unmatched despite online drivers in range.

**Prevention:**
- Use geohash precision 5 (~5km radius) as the initial query radius for towing (not ride-share; tow trucks cover more ground)
- `geofire-common` provides `geohashQueryBounds()` — use the recommended precision for the expected service radius
- Confirm the existing geohash precision in `geoLocationUtils.ts` matches the expected matching radius

**Phase:** Matching/proximity — audit during the stability hardening phase.

---

## Summary: Priority Order

| Priority | Pitfall | Phase to Fix |
|----------|---------|-------------|
| 1 (CRITICAL) | PITFALL-04: Open Firestore rules | Before any Stripe testing |
| 2 (CRITICAL) | PITFALL-01: finalPrice never set | First task in Stripe integration |
| 3 (HIGH) | PITFALL-02: Non-transactional acceptRequest() | Before wiring payment triggers |
| 4 (HIGH) | PITFALL-06: EAS Build required for notifications | First task in notifications phase |
| 5 (HIGH) | PITFALL-05: No webhook handler | Document for capstone, implement in hardening |
| 6 (MEDIUM) | PITFALL-03: Straight-line distance pricing | Define approach before Stripe |
| 7 (MEDIUM) | PITFALL-07: Push token stored once | Build right from start |
| 8 (MEDIUM) | PITFALL-08: No error boundaries on payment | Handle during Stripe integration |
| 9 (MEDIUM) | PITFALL-09: Geohash precision | Audit during hardening |

---

*Pitfalls research: 2026-03-13*
