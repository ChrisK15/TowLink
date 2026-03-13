# Architecture

**Analysis Date:** 2026-03-13

## Pattern Overview

**Overall:** Layered Mobile Architecture with Role-Based Navigation

**Key Characteristics:**
- File-based routing (Expo Router) for screen organization
- Role-based navigation structure (auth → commuter/driver role paths)
- Real-time data synchronization via Firebase Firestore listeners
- Custom React hooks for business logic encapsulation
- Context-based global state (authentication, user role)
- Component-driven UI with bottom sheets and modals for interaction patterns

## Layers

**Presentation Layer (UI):**
- Purpose: Render screens and handle user interactions
- Location: `app/` directory (organized by route groups)
- Contains: Screen components (`.tsx` files), modal components, navigation layout configurations
- Depends on: Context (auth), Hooks (business logic), Components (UI building blocks)
- Used by: Expo Router for file-based routing

**State Management Layer:**
- Purpose: Manage global state (authentication, user role) and side effects
- Location: `context/auth-context.tsx`, custom hooks in `hooks/`
- Contains: AuthContext provider, custom hooks (useActiveTrip, useClaimedRequest, etc.)
- Depends on: Firebase services for data fetching
- Used by: All screen components and components needing auth/data state

**Business Logic Layer:**
- Purpose: Handle calculations, transformations, and request lifecycle
- Location: `services/` directory (request calculations, geolocation utilities)
- Contains: Functions like `enrichRequestWithCalculations()`, `calculateDistanceMiles()`, `getGeohash()`
- Depends on: Types and Firebase service layer
- Used by: Components and hooks

**Data Access Layer:**
- Purpose: Abstract Firebase operations (Firestore, Auth, Storage)
- Location: `services/firebase/` directory
- Contains: `firestore.ts` (all Firestore CRUD and listeners), `authService.ts` (auth operations), `config.ts` (Firebase initialization)
- Depends on: Firebase SDK, TypeScript models
- Used by: Business logic and state management layers

**Type Definitions:**
- Purpose: Define domain models and interfaces
- Location: `types/models.ts`
- Contains: User, Driver, Request, Trip, Location, ServiceType, VehicleInfo
- Depends on: Nothing (foundational layer)
- Used by: All other layers

## Data Flow

**Request Creation Flow (Commuter):**

1. Commuter opens app → Root layout checks auth context → Redirects to commuter screen
2. Commuter taps "Request Assistance" → RequestServiceSheet modal opens
3. Commuter selects service type and location → Component validates location via `expo-location`
4. Component calls `createRequest()` from `firestore.ts` with pickup/dropoff/service data
5. `createRequest()` validates coordinates, creates Firestore document, returns request ID
6. Component shows FindingDriverModal with request ID
7. Firestore listeners active on driver side trigger updates via `listenForRequests()`
8. Driver claims request → updates status to 'claimed'
9. Driver accepts claimed request → Firestore transaction updates status to 'accepted' and creates Trip document

**Real-Time Trip Tracking Flow (Driver → Commuter):**

1. Trip is accepted, Trip document created in Firestore
2. Driver screen: `useActiveTrip(tripId)` hook sets up Firestore listener via `listenToTrip()`
3. Commuter screen: `useCommuterTrip(tripId)` hook listens to same Trip document
4. Any trip update (status change, location path update) triggers listener callbacks on both clients
5. Components re-render with updated trip data
6. Maps update to show driver position, pickup/dropoff locations
7. Trip completion: status updated to 'completed' → driver availability reset via `updateDriverAvailability()`

**State Management Flow:**

1. App initialization: `RootLayout` wraps app with `AuthProvider`
2. `AuthProvider` sets up Firebase `onAuthStateChanged()` listener
3. On auth state change, fetches user role from Firestore users collection
4. Updates context state (user, role, loading)
5. `RootLayoutNav` checks role and redirects to correct route group: `/(auth)`, `/(commuter)`, or `/(driver)`
6. Global state available via `useAuth()` hook in any component

## Key Abstractions

**Request Lifecycle State Machine:**
- Purpose: Model the progression of a request from creation to completion
- Examples: `services/firebase/firestore.ts` (functions like `claimRequest()`, `acceptClaimedRequest()`, `declineClaimedRequest()`)
- Pattern: Each state transition validated with Firestore transactions to prevent race conditions
- States: searching → claimed → accepted → (Trip) en_route → completed/cancelled

**Trip Lifecycle State Machine:**
- Purpose: Track trip progression from driver en route to completion
- Examples: `services/firebase/firestore.ts` (functions like `updateTripStatus()`)
- Pattern: Status update includes relevant timestamp (arrivalTime, completionTime, startedAt)
- States: en_route → arrived → in_progress → completed/cancelled

**Custom Hook Pattern:**
- Purpose: Encapsulate subscription logic and data transformations
- Examples: `hooks/use-active-trip.ts`, `hooks/use-claimed-request.ts`, `hooks/use-watch-request.ts`
- Pattern: Hooks manage Firestore listeners with cleanup, expose data and loading states
- Benefits: Decouples components from Firebase SDK, enables reuse across screens

**Location Data Model:**
- Purpose: Consistent geographic representation
- Examples: `types/models.ts` Location interface (latitude, longitude)
- Pattern: All location data stored and passed as Location objects, geohashing for spatial queries

**Bottom Sheet Modal Components:**
- Purpose: UI pattern for service selection, driver offers, trip details
- Examples: `components/RequestServiceSheet.tsx`, `components/ActiveTripSheet.tsx`, `components/CommuterTripSheet.tsx`
- Pattern: Built with `@gorhom/bottom-sheet`, controlled via state in parent screen

## Entry Points

**Root Entry: `app/_layout.tsx`**
- Location: `app/_layout.tsx`
- Triggers: App initialization
- Responsibilities:
  - Wraps entire app with AuthProvider, ThemeProvider, BottomSheetModalProvider, GestureHandlerRootView
  - Implements conditional navigation based on auth state and user role
  - Manages theme (dark/light) via useColorScheme hook
  - Renders loading spinner during auth state check

**Auth Entry: `app/(auth)/_layout.tsx`**
- Location: `app/(auth)/_layout.tsx`
- Triggers: User not authenticated
- Responsibilities: Renders Stack navigation for auth flow (signup, login, onboarding)

**Commuter Entry: `app/(commuter)/_layout.tsx`**
- Location: `app/(commuter)/_layout.tsx`
- Triggers: User authenticated with role = 'commuter'
- Responsibilities: Renders Tab navigation with commuter screens

**Driver Entry: `app/(driver)/_layout.tsx`**
- Location: `app/(driver)/_layout.tsx`
- Triggers: User authenticated with role = 'driver'
- Responsibilities: Renders Stack navigation for driver flow

**Commuter Main Screen: `app/(commuter)/index.tsx`**
- Location: `app/(commuter)/index.tsx`
- Triggers: When commuter logs in
- Responsibilities:
  - Requests location permissions and tracks user location
  - Renders map with user marker
  - Handles request creation via RequestServiceSheet modal
  - Displays FindingDriverModal during request search
  - Shows CommuterTripSheet when trip is active

**Driver Main Screen: `app/(driver)/index.tsx`**
- Location: `app/(driver)/index.tsx`
- Triggers: When driver logs in
- Responsibilities:
  - Tracks driver location and maintains availability toggle
  - Listens for claimed requests via custom hook
  - Shows RequestPopup for claim decisions
  - Displays ActiveTripSheet during active trip
  - Manages trip status transitions

## Error Handling

**Strategy:** Layered error handling with try-catch blocks, Firebase transaction validation, and user alerts

**Patterns:**

**Firestore Operations Errors (Data Access Layer):**
- Location: `services/firebase/firestore.ts`
- Example: `createRequest()` validates coordinate ranges before creating document
- Example: `acceptClaimedRequest()` uses Firestore transaction to validate request state before acceptance
- Throws: Custom error messages with context (e.g., "Request already claimed")

**Authentication Errors (Auth Service):**
- Location: `services/firebase/authService.ts`
- Maps Firebase error codes to user-friendly messages (auth/invalid-credential → "Invalid email or password")
- Throws: Error with descriptive message for UI display

**Permission Errors (Location Access):**
- Location: `app/(commuter)/index.tsx`, `app/(driver)/index.tsx`
- Pattern: Check location permission status before requesting position
- Fallback: Display Alert if permission denied

**Real-Time Listener Errors:**
- Location: Custom hooks (`hooks/use-active-trip.ts`, etc.)
- Pattern: Set error state on listener failure, expose via hook return
- Consumer: Component checks error state and displays to user if needed

## Cross-Cutting Concerns

**Logging:**
- Pattern: console.log/error() for debugging Firebase operations and state changes
- Location: Scattered in `firestore.ts` and `authService.ts`
- Improvements needed: Centralize logging, consider structured logging for production

**Validation:**
- Coordinate validation: `firestore.ts` validates latitude/longitude ranges before creating requests
- Input validation: Form screens validate email, password, service selection before submission
- State validation: Firestore transactions validate status before state transitions

**Authentication:**
- Provider: Firebase Auth with persistence via React Native AsyncStorage
- Context: Global AuthContext (`context/auth-context.tsx`) provides user, role, loading state
- Refresh: Context refetches user role on auth state change and via explicit `refreshRole()` function

**Geolocation:**
- Permission handling: `expo-location` for permission requests and position tracking
- Reverse geocoding: `services/geoLocationUtils.ts` converts coordinates to addresses
- Geohashing: Driver location stored as geohash for spatial indexing in Firestore

---

*Architecture analysis: 2026-03-13*
