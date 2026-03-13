# External Integrations

**Analysis Date:** 2026-03-13

## APIs & External Services

**Geolocation & Mapping:**
- Google Maps API - Mapping and geocoding
  - SDK/Client: react-native-maps 1.20.1, expo-location 19.0.8
  - Auth: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (environment variable)
  - Configuration: Injected in `app.config.js` for iOS and Android
  - Usage: `services/geoLocationUtils.ts` - Geocoding, reverse geocoding, geohashing queries

**Geospatial Querying:**
- geofire-common 6.0.0 - Geohash-based location queries
  - Functions: `geohashForLocation()`, `geohashQueryBounds()`, `distanceBetween()`
  - Used in: `services/geoLocationUtils.ts`, `services/firebase/firestore.ts`
  - Purpose: Efficient radius-based driver discovery queries

## Data Storage

**Databases:**
- Firebase Firestore - NoSQL document database
  - Connection: Initialized in `services/firebase/config.ts` via Firebase Admin SDK
  - Client: firebase 12.4.0 SDK
  - Collections: `requests`, `trips`, `drivers`, `users`
  - Configuration: Project ID `towlink-71a59` via environment variables
  - Persistence: React Native AsyncStorage for offline auth persistence
  - Transaction support: Used for atomic operations in `acceptClaimedRequest()`, `claimRequest()`, `declineClaimedRequest()`

**File Storage:**
- Firebase Storage - Cloud file storage
  - Connection: `getStorage(app)` initialized in `services/firebase/config.ts`
  - Purpose: Store driver documents (license, registration, insurance), user profile images (planned)
  - SDKs initialized but not actively used in current codebase

**Local Persistent Storage:**
- @react-native-async-storage/async-storage 2.2.0 - On-device key-value store
  - Purpose: Auth token persistence for offline support
  - Integrated with Firebase Auth via `getReactNativePersistence()`

**Caching:**
- React state via hooks - In-memory application state
- Firebase Real-time Listeners - Live query subscriptions
- No external cache service (Redis, Memcached) configured

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication - Custom email/password authentication
  - Implementation: `services/firebase/authService.ts`
  - Methods available:
    - `signUpWithEmail()` - Email/password registration, creates Firestore user document
    - `signInWithEmail()` - Email/password login, returns user ID and role
    - `signOut()` - Session termination
  - Credentials stored: Firebase Auth SDK manages internally with AsyncStorage persistence
  - User data supplementation: Role ('commuter', 'driver', 'both', null) stored in Firestore `users` collection

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Crashlytics, or third-party error tracking configured

**Logs:**
- console.log/console.error - Client-side logging to development console only
  - Locations: `services/firebase/firestore.ts` (driver updates, trips), `services/firebase/authService.ts` (auth errors)
  - Production logging: Not configured

**Analytics:**
- Not detected - No Firebase Analytics, Mixpanel, or event tracking configured

## CI/CD & Deployment

**Hosting:**
- Expo (development) - Expo Go app for testing
- EAS (planned) - Expo Application Services for building and deployment
- Firebase - Backend services (Firestore, Auth, Storage)

**CI Pipeline:**
- Not detected - No GitHub Actions, CircleCI, or Jenkins configured
- Local development: `npm run android`, `npm run ios`, `npm start` via Expo CLI

**Build Configuration:**
- Expo prebuild - Automated native code generation
- EAS Build (available but not configured in tracked files)

## Environment Configuration

**Required env vars:**
```
EXPO_PUBLIC_FIREBASE_API_KEY - Firebase API credentials
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN - Firebase auth domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID - Firebase project ID (towlink-71a59)
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET - Firebase storage bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID - Firebase messaging sender ID
EXPO_PUBLIC_FIREBASE_APP_ID - Firebase app ID
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY - Google Maps API key
```

**Secrets location:**
- `.env` file in project root (not committed to git, listed in .gitignore)
- Only `EXPO_PUBLIC_*` variables are exposed to the app at build time
- Private variables (if any) would not be prefixed with `EXPO_PUBLIC_` but are not currently used

**Firebase Configuration:**
- `.firebaserc` - Maps default Firebase project to `towlink-71a59`
- Firebase CLI support available but not actively used in current workflows

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook endpoints in current codebase
- Planning: Firebase Cloud Functions for trip events (planned for future phases)

**Outgoing:**
- Firebase Real-time Database listeners (for driver/request updates)
  - `listenForRequests()` - Real-time subscription to searching requests
  - `listenForClaimedRequests()` - Real-time subscription to claimed requests for specific driver
  - `listenToTrip()` - Real-time subscription to active trip status
  - `listenToRequest()` - Real-time subscription to individual request status

## Payment Integration

**Status:** Planned but not implemented
- Stripe - Payment processing (mentioned in CLAUDE.md as part of tech stack)
- Current codebase: No Stripe SDK or payment processing logic detected
- Estimated price calculations exist (`services/requestCalculations.ts`) but no actual payment processing

## Data Models & Schemas

**Core Collections:**

**users** (Firestore)
- id (string) - Firebase UID
- email (string)
- name (string, optional)
- role ('commuter' | 'driver' | 'both' | null)
- phone (string, optional)
- createdAt (Timestamp)
- rating (number, optional)

**drivers** (Firestore)
- id (string)
- userId (string) - Reference to users
- isAvailable (boolean)
- isVerified (boolean)
- vehicleInfo (object) - make, model, year, licensePlate, towingCapacity
- documents (object, optional) - driversLicense, vehicleRegistration, insurance URLs
- currentLocation (object) - latitude, longitude
- geohash (string, optional)
- serviceRadius (number)
- rating (number, optional)
- totalTrips (number)
- lastLocationUpdate (Timestamp, optional)
- isActivelyDriving (boolean, optional)

**requests** (Firestore)
- id (string)
- commuterId (string)
- location (object) - pickup coordinates
- dropoffLocation (object)
- pickupAddress (string)
- dropoffAddress (string)
- serviceType ('tow' | 'jump_start' | 'fuel_delivery' | 'tire_change' | 'lockout' | 'winch_out')
- status ('searching' | 'claimed' | 'matched' | 'accepted' | 'cancelled')
- matchedDriverId (string, optional)
- claimedByDriverId (string, optional)
- claimExpiresAt (Timestamp, optional)
- notifiedDriverIds (array, optional)
- createdAt (Timestamp)
- expiresAt (Timestamp)
- commuterName (string, optional)
- commuterPhone (string, optional)
- vehicleInfo (object, optional)
- estimatedPrice (number, optional)
- totalTripDistance (number, optional)
- customerNotes (string, optional)

**trips** (Firestore)
- id (string)
- requestId (string) - Reference to request
- commuterId (string)
- driverId (string)
- status ('en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled')
- pickupLocation (object)
- dropoffLocation (object)
- pickupAddress (string)
- dropoffAddress (string)
- startTime (Timestamp)
- arrivalTime (Timestamp, optional)
- completionTime (Timestamp, optional)
- startedAt (Timestamp, optional)
- distance (number)
- estimatedPrice (number)
- finalPrice (number, optional)
- driverPath (array) - Array of location objects tracking driver route

---

*Integration audit: 2026-03-13*
