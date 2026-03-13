# Stack Research: TowLink MVP Additions

**Research Date:** 2026-03-13
**Scope:** Adding Stripe payments and push notifications to existing React Native + Expo 54 + Firebase app

---

## Stripe Payments

### Recommended Library
**`@stripe/stripe-react-native`** (latest ~0.40.x)

- React Native New Architecture (Fabric/TurboModules) supported since ~0.35.x — compatible with TowLink's `newArchEnabled: true`
- Use **PaymentSheet** UX pattern: renders native Stripe-hosted payment UI, handles 3DS, saves payment methods
- Install: `npx expo install @stripe/stripe-react-native` (resolves correct compatible version)

**Confidence: HIGH** — official Stripe library, actively maintained, Expo SDK 54 compatible

### Server-Side Architecture (Required for PCI compliance)
- **PaymentIntents must be created server-side** via Firebase Cloud Functions — Stripe's rules, not optional
- Flow: client requests PaymentIntent → Cloud Function creates it (with amount + currency) → client confirms via PaymentSheet
- Never pass the Stripe secret key to the client

### Driver Payouts
- **Stripe Connect Express** — drivers onboard via Stripe-hosted flow, earnings transferred to their connected account
- Requires Cloud Function to create Transfer after trip completion
- Alternative: manual payouts initially, Connect later — acceptable for capstone

### What NOT to Use
- `tipsi-stripe` — deprecated, unmaintained
- `react-native-purchases` — wrong use case (subscriptions, not payments)

---

## Push Notifications

### Recommended Approach
**`expo-notifications`** (~0.29.x for SDK 54) + **`expo-device`**

- Use **raw FCM token path** (not Expo Push Service relay) to stay within Firebase backend
- `expo-notifications` can extract the raw FCM token: `getDevicePushTokenAsync()` returns FCM token directly
- Store FCM token in Firestore user document on login/refresh
- Trigger notifications via **Firebase Cloud Functions** calling FCM HTTP v1 API

**Confidence: HIGH** — expo-notifications is the standard path; raw FCM keeps backend pure Firebase

### Why NOT `@react-native-firebase/messaging`
- Conflicts with the existing Firebase JS SDK (`firebase` v12) — cannot use both in the same project without migrating the entire Firebase integration to the native SDK
- Migration cost is too high for this milestone

### Critical Constraint: EAS Build Required
- `expo-notifications` with FCM does **not** work in Expo Go
- This milestone forces adoption of **EAS Build** (or local dev builds) for notification testing
- EAS Build is free tier available; `eas build --profile development --platform ios/android`

### Notification Triggers (via Cloud Functions)
| Event | Recipient | When |
|-------|-----------|------|
| New request matched | Driver | When request status → `claimed` (proximity match) |
| Driver accepted | Commuter | When request status → `accepted` |
| Driver arrived | Commuter | When trip status → `arrived` |

---

## Firebase Cloud Functions

- Required for: Stripe PaymentIntent creation, Stripe Connect transfers, FCM notification dispatch
- Use **Firebase Functions v2** (2nd gen) — better cold start, more generous free tier
- Language: TypeScript (consistent with existing codebase)
- Local testing: `firebase emulators:start --only functions,firestore`

---

## Distance-Based Pricing

- Calculate distance client-side using `geofire-common` (already installed) `distanceBetween()` or Haversine formula
- Convert to fare: `base_rate + (distance_miles * per_mile_rate)`
- Store `estimatedFare` on Request document at creation time
- Final fare calculated from actual trip path or straight-line pickup→dropoff distance

---

## Dependencies Summary

| Library | Purpose | Install Command |
|---------|---------|----------------|
| `@stripe/stripe-react-native` | Payment UI + SDK | `npx expo install @stripe/stripe-react-native` |
| `expo-notifications` | Push token + local notifications | `npx expo install expo-notifications` |
| `expo-device` | Device detection (required by expo-notifications) | `npx expo install expo-device` |
| `firebase-admin` (Cloud Functions) | FCM dispatch, Stripe webhook verification | `npm install firebase-admin` (in functions/) |
| `stripe` (Cloud Functions) | Server-side PaymentIntent creation | `npm install stripe` (in functions/) |

---

## Confidence Levels

- Library choices: **HIGH** — industry standard, well-documented
- Version numbers: **LOW** — use `npx expo install` for authoritative SDK-compatible versions
- Architecture patterns: **HIGH** — Stripe PCI requirements and FCM token approach are non-negotiable

---

*Stack research: 2026-03-13*
