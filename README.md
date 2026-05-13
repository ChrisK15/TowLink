# TowLink

TowLink is a B2B roadside-towing dispatch platform built with React Native, Expo, and Firebase. Stranded commuters submit a tow request from the mobile app; the system routes it to the geographically nearest affiliated tow yard and assigns the job to an available driver using a fair distribution algorithm. Tow yard admins manage their fleet and monitor live jobs from an in-app dashboard — no manual dispatcher required.

## Project Status

**Final capstone deliverable — completed 2026-05-12.**

Built as a university capstone project. The repository represents the v1.0 milestone scope. Push notifications and Stripe payments were intentionally deferred to a future v2.

## What's in v1

**Commuter app**
- Email/password signup and login with role persistence
- Tow request with pickup/dropoff location, service type, and live GPS
- Live map view of the assigned driver with route polyline and ETA
- Real-time status updates as the trip moves through `searching → claimed → accepted → en_route → arrived → in_progress → completed`
- Post-trip completion summary screen

**Driver app**
- Company-linked authentication (drivers log in with their company-issued email — no self-registration)
- Online/offline availability toggle
- Incoming job popup with accept/decline
- Live navigation card with route polyline, ETA, and an "Open in Maps" handoff
- Trip controls: en route → arrived → in progress → completed, with cancel before trip start
- Post-trip completion summary screen

**Admin dashboard (tow yard operators)**
- Company registration with address and service area
- Driver roster: add by company email, swipe-to-deactivate
- Real-time jobs list with status badges

**Platform**
- Nearest-company routing with fair in-company job distribution (Cloud Functions)
- Geohash-based spatial queries (`geofire-common`)
- Firestore transactions for race-condition-safe request claiming
- Role-based Firestore security rules (admin / driver / commuter) with full rules test coverage
- Loading, error, and toast UX wired across every Firebase-touching screen
- Firebase emulators with deterministic seed data for local dev

## Tech Stack

| Category    | Technology                                    |
| ----------- | --------------------------------------------- |
| Framework   | React Native 0.81 + Expo SDK 54 (New Arch on) |
| Language    | TypeScript 5.9                                |
| Navigation  | Expo Router (file-based)                      |
| Backend     | Firebase Auth, Firestore, Cloud Functions     |
| Maps        | `react-native-maps` + Google Directions API   |
| Spatial     | `geofire-common` (geohash queries)            |
| UI          | `react-native-unistyles` v3, Inter font       |
| Sheets      | `@gorhom/bottom-sheet`                        |
| Testing     | Jest, `@firebase/rules-unit-testing`          |

## Project Structure

```
app/                       Expo Router screens
  (auth)/                  Onboarding, login, signup, role/setup
  (commuter)/              Commuter request + active trip
  (driver)/                Driver dashboard + active trip
  (admin)/                 Jobs + drivers (tow yard admins)
components/
  ui/                      Shared design system (Button, Card, Input, Badge, Header)
  ...                      Feature components (sheets, popups, overlays)
constants/
  unistyles-theme.ts       Design tokens (colors, type, spacing)
services/
  firebase/                Firestore operations, auth, config
  directions.ts            Google Directions wrapper with polyline decode
  location/                Permission + watcher helpers
functions/                 Cloud Functions (dispatch engine)
firestore.rules            Role-based security rules
scripts/seed-emulator.js   Deterministic emulator seed
```

## Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI (`npx expo`)
- Firebase CLI (`npm install -g firebase-tools`)
- Google Maps API key (for `react-native-maps` + Directions)
- iOS Simulator (Xcode) and/or Android emulator (Android Studio)

### Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Log into Firebase:
   ```bash
   firebase login
   ```
4. Copy `.env.example` to `.env` and fill in the Firebase + Google Maps values.
5. Start the dev server:
   ```bash
   npx expo start
   ```

### Local Development with Emulators

Run against the Firebase emulator suite (Auth, Firestore, Functions) for fast, offline-safe iteration:

```bash
npm run emulators         # start emulators
npm run emulators:seed    # populate with deterministic test data
```

Set `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` in `.env` to connect the app to the emulators instead of the production project.

## Scripts

| Command                 | Description                                     |
| ----------------------- | ----------------------------------------------- |
| `npm start`             | Start Expo dev server                           |
| `npm run ios`           | Build and run on iOS simulator                  |
| `npm run android`       | Build and run on Android emulator               |
| `npm run web`           | Run the web build                               |
| `npm run lint`          | Lint with `expo lint`                           |
| `npm test`              | Run all Jest projects (unit + rules)            |
| `npm run test:rules`    | Firestore security rules tests only             |
| `npm run test:unit`     | Unit tests only                                 |
| `npm run emulators`     | Start Firebase emulators (Auth/Firestore/Funcs) |
| `npm run emulators:seed`| Seed emulators with test data                   |

## License

University capstone project — not licensed for redistribution.
