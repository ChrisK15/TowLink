# Architecture Patterns: TowLink MVP Additions

**Research Date:** 2026-03-13
**Scope:** Integrating Stripe payments and push notifications into existing Firebase + React Native architecture
**Confidence:** HIGH (Stripe + Firebase Cloud Functions), HIGH (Expo push notifications), MEDIUM (Stripe Connect for driver payouts)

---

## Core Architectural Constraint

**No Stripe secret key can live in the React Native client.** The client bundle is inspectable. Any secret key in client code is public.

This forces a clean boundary:

```
React Native Client (publishable key only)
        ↓ HTTPS callable
Firebase Cloud Functions (secret key, Stripe Node SDK)
        ↓ Stripe API
Stripe (PaymentIntent, Transfer, Connect)
```

Firestore acts as the coordination layer. The client writes state changes (e.g., trip `completed`), Cloud Functions react to Firestore triggers or HTTPS callables, execute Stripe logic, and write results back. The client observes results via its existing real-time listeners — no changes to the hook pattern needed.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|--------------|-------------------|
| React Native Client | Collect payment method, display fare, handle notifications | Stripe SDK (publishable key), Cloud Functions (HTTPS callable), Firestore (real-time) |
| `services/payment/stripe.ts` | Client-side Stripe: present PaymentSheet, return result | `@stripe/stripe-react-native`, Cloud Functions |
| `services/notifications/push.ts` | Register push token, store to Firestore, handle foreground notifications | `expo-notifications`, Firestore |
| CF: `createPaymentIntent` | Create Stripe PaymentIntent, return client secret | Stripe Node SDK (secret key), Firestore (read trip/fare) |
| CF: `capturePayment` | Confirm charge at trip completion, write payment status | Stripe Node SDK, Firestore (write `paymentStatus`, `paymentIntentId`) |
| CF: `payoutDriver` | Transfer funds to driver's Stripe Connect account | Stripe Node SDK, Firestore (read driver Stripe account ID) |
| CF: `onTripStatusChange` | Firestore-triggered: send push notifications on trip state transitions | Expo Push API (`expo-server-sdk`), Firestore |
| CF: `onRequestClaimed` | Firestore-triggered: notify matched driver of new job | Expo Push API, Firestore (read driver push token) |
| `trips/{tripId}` | Stores `paymentStatus`, `paymentIntentId`, `finalPrice`, `driverPayoutStatus` | Written by CFs, read by both client roles |
| `users/{userId}` | Stores `expoPushToken`, `stripeCustomerId` | Written by client (token) + CF (customer ID); read by CFs |
| `drivers/{driverId}` | Stores `stripeAccountId` (Connect) | Written by CF during onboarding; read by `payoutDriver` CF |

---

## Data Flow: Stripe Payment

### Fare Display (Client Only — No Stripe API Call)

```
1. Commuter selects pickup/dropoff
2. Client calls calculateDistanceMiles() (already in services/)
3. Client applies rate formula: base_rate + (distance_miles × per_mile_rate)
4. Estimated fare shown in RequestServiceSheet before commuter confirms
5. estimatedPrice stored on Request document at creation
```

### Payment Collection at Trip Completion

```
1. Driver taps "Complete Trip" → updateTripStatus(tripId, 'completed')
2. Firestore Trip.status → 'completed'
3. Commuter's CommuterTripSheet shows final fare + "Pay Now" button
4. Commuter taps "Pay Now":
   → Client calls CF: createPaymentIntent({ tripId })
   → CF reads Trip.finalPrice (set at trip start from estimatedPrice)
   → CF creates Stripe PaymentIntent with amount in cents
   → CF returns { clientSecret }
5. Client calls presentPaymentSheet(clientSecret)
   → Stripe renders native payment UI (card input, Apple/Google Pay)
   → Commuter completes payment
6. Client calls CF: capturePayment({ tripId, paymentIntentId })
7. CF confirms charge, writes to Trip: paymentStatus = 'paid', paymentIntentId stored
8. Commuter's Firestore listener sees paymentStatus → UI shows "Payment Complete"
```

### Driver Payout

```
1. CF trigger: onUpdate('trips/{tripId}') detects paymentStatus changed to 'paid'
2. CF reads: trip.driverId, trip.finalPrice
3. CF reads: drivers/{driverId}.stripeAccountId
4. CF creates Stripe Transfer: platform → driver Connect account
5. CF writes: Trip.driverPayoutStatus = 'transferred'
```

**Capstone note:** Stripe Connect requires real account setup for live mode. In test mode, use Stripe test connected account IDs. Real Connect onboarding flow (embedded or hosted) can be deferred until post-capstone.

---

## Data Flow: Push Notifications

### Token Registration (Every App Launch)

```
1. App mounts → services/notifications/push.ts
2. Request notification permission (iOS: user prompt; Android: auto-granted API 32-)
3. Call expo-notifications getExpoPushTokenAsync({ projectId })
4. Write token to Firestore: users/{userId}.expoPushToken
5. Register addPushTokenListener callback → update Firestore on rotation
```

**Critical:** Tokens rotate on device reinstall and iOS refresh events. Must re-register on every launch, not just once at signup.

### Notification Triggers

```
Firestore trigger: onUpdate('requests/{requestId}')
  if newData.status === 'claimed':
    → read users/{newData.claimedDriverId}.expoPushToken
    → send "New tow job available" to driver

Firestore trigger: onUpdate('trips/{tripId}')
  if status changed:
    'accepted'  → notify commuter: "Driver is on the way"
    'arrived'   → notify commuter: "Driver has arrived"
    'completed' → notify commuter: "Trip complete — please pay"
    'cancelled' → notify both parties
```

No changes to existing Firestore state machine logic — Cloud Functions observe the same writes the client already makes.

### Sending from Cloud Function (Node.js)

```typescript
import Expo from 'expo-server-sdk'; // npm install expo-server-sdk (in functions/)
const expo = new Expo();

const messages = [{
  to: expoPushToken,        // from Firestore users/ doc
  sound: 'default',
  title: 'Driver Accepted',
  body: 'Your driver is on the way',
  data: { tripId, screen: 'trip' },
}];
const chunks = expo.chunkPushNotifications(messages);
for (const chunk of chunks) {
  await expo.sendPushNotificationsAsync(chunk);
}
```

---

## Where Logic Lives

| Operation | Location | Rule |
|-----------|----------|------|
| Fare calculation | Client `services/payment/stripe.ts` | Pure math, no secrets |
| Display fare | Client UI components | UI layer |
| Payment UI (card input) | `@stripe/stripe-react-native` `presentPaymentSheet()` | Stripe handles PCI |
| Create PaymentIntent | Cloud Function (HTTPS callable) | Requires secret key |
| Capture/confirm payment | Cloud Function (HTTPS callable) | Requires secret key |
| Transfer to driver | Cloud Function (Firestore trigger) | Requires secret key |
| Send push notifications | Cloud Function (Firestore trigger) | Server-side, tokens private |
| Register push token | Client `services/notifications/push.ts` | Device API, client-only |
| Store push token | Client writes to `users/{userId}.expoPushToken` | Needed by CFs |

**Rule:** If it needs `STRIPE_SECRET_KEY` or push tokens of other users, it lives in Cloud Functions.

---

## Firebase Security Rules: Critical Changes

Current rules: `allow read, write: if true` — must change before production.

```javascript
// trips/ — payment fields are server-only (Admin SDK bypasses rules)
match /trips/{tripId} {
  allow read: if request.auth != null
    && (resource.data.commuterId == request.auth.uid
     || resource.data.driverId == request.auth.uid);

  allow update: if request.auth != null
    && (resource.data.commuterId == request.auth.uid
     || resource.data.driverId == request.auth.uid)
    && !('paymentStatus' in request.resource.data)
    && !('paymentIntentId' in request.resource.data)
    && !('finalPrice' in request.resource.data)
    && !('driverPayoutStatus' in request.resource.data);
}

// users/ — push tokens and Stripe IDs are owner-only
match /users/{userId} {
  allow read, write: if request.auth != null
    && request.auth.uid == userId;
}
```

---

## Build Order

### Phase: Stripe Integration
1. Set up Cloud Functions project (`functions/` dir), verify deploy with hello-world
2. Fare calculation formula on client — pure math, unblocks UX
3. `createPaymentIntent` CF — first real Stripe function; required before any client payment UI
4. Client PaymentSheet — `<StripeProvider>` in root layout, `presentPaymentSheet()`
5. Add payment fields to `types/models.ts` Trip interface
6. `capturePayment` CF + `payoutDriver` Firestore trigger

### Phase: Push Notifications
1. Install `expo-notifications`, update `app.json` (iOS background modes, Android channel)
2. Token registration service — called at auth init
3. `onRequestClaimed` CF — simplest end-to-end notification test
4. `onTripStatusChange` CF — all trip status notifications
5. Notification tap deep linking — Expo Router linking config

### Dependency Graph

```
Fare display (no deps, client only)
    ↓
Cloud Functions project setup (unblocks all CF work)
    ↓              ↓
Stripe payment    expo-notifications install + app.json
    ↓                    ↓
payoutDriver CF     Token registration
                         ↓
                  Notification CFs
```

Payments and notifications can be built in parallel after CF project setup.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Risk | Prevention |
|-------------|------|-----------|
| Stripe secret key in client bundle | Full account compromise | Publishable key only in app; secret key in CF env vars |
| Client-supplied payment amount | User pays $0.01 for any trip | CF reads `finalPrice` from Firestore, ignores client amount |
| Push tokens readable by all users | Token spam attacks | `users/` doc readable by owner only |
| Auto-charge on `status = 'completed'` write | Commuter can write `completed` to trigger charge on someone else's trip | HTTPS callable verifies `request.auth.uid === trip.commuterId` |
| Storing push token once at signup | Silent notification failures after token rotation | Re-register on every app launch + `addPushTokenListener` |

---

*Architecture research: 2026-03-13*
