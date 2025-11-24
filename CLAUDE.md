# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TowLink** is a roadside towing mobile application that connects commuters needing help with independent tow truck drivers. It's a university senior design capstone project built as a dual-mode app (similar to Uber's driver/rider model) where users can switch between Commuter and Driver roles.

### Problem Being Solved
- **Commuters**: Need quick, affordable roadside towing without insurance/AAA
- **Drivers**: Need steady income and consistent work without waiting on body shops
- **Solution**: Real-time marketplace connecting both sides with geolocation matching

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **Maps**: Google Maps API via react-native-maps
- **Payments**: Stripe (Phase 4)
- **Notifications**: Firebase Cloud Messaging
- **Real-time Updates**: Firestore real-time listeners

## Development Commands

### Starting the app
```bash
npx expo start         # Start development server
npm run android        # Open in Android emulator
npm run ios           # Open in iOS simulator
npm run web           # Open in web browser (limited - mobile-first app)
```

### Code quality
```bash
npm run lint          # Run ESLint with Expo config
```

### Firebase (when configured)
```bash
# Firebase emulators for local development
firebase emulators:start
```

## Project Architecture

### Application Structure

#### Current Structure (What Exists Now):
```
/app/(tabs)/
  /index.tsx          # POC test screen with all functionality
  /commuter.tsx       # ✅ NEW - Commuter request screen with map
  /_layout.tsx        # Tab navigation layout
  /explore.tsx        # Placeholder from template

/services/firebase/
  /config.ts          # Firebase initialization with AsyncStorage
  /firestore.ts       # All Firestore operations (createRequest, acceptRequest, etc.)

/types/
  /models.ts          # TypeScript interfaces (User, Driver, Request, Trip, etc.)

/components/          # Themed components from Expo template
/hooks/               # Theme hooks from Expo template
/constants/           # Theme constants from Expo template

app.config.js         # ✅ NEW - Expo config with environment variables
.env                  # ✅ NEW - Environment variables (not in git)
.env.example          # ✅ NEW - Environment variable template
```

#### Planned Structure (Future Phases):
```
/app                    # Expo Router file-based routing
  /_layout.tsx         # Root layout with theme
  /(auth)/             # Authentication screens (Phase 4)
    /login.tsx
    /register.tsx
  /(commuter)/         # Commuter mode screens (Phase 2-3)
    /request.tsx       # Request screen with map
    /tracking.tsx      # Track active trip
  /(driver)/           # Driver mode screens (Phase 2-3)
    /dashboard.tsx     # Driver dashboard with requests
    /active-trip.tsx   # Active trip management

/components            # Reusable UI components (Phase 2+)
  /maps/               # Map-related components
  /ui/                 # Custom UI components

/services              # Business logic layer
  /firebase/
    /firestore.ts      # ✅ EXISTS - Database operations
    /auth.ts           # Authentication service (Phase 4)
  /location/
    /tracking.ts       # GPS location tracking (Phase 2)
  /maps/
    /routing.ts        # Route calculation (Phase 2)

/hooks                 # Custom React hooks (Phase 2+)
  /use-location.ts     # Location tracking hook
  /use-auth.ts         # Authentication hook

/constants
  /theme.ts            # ✅ EXISTS - Theme constants
  /config.ts           # App constants (Phase 2)
```

### Core Data Models

#### Firestore Collections

**users/** - User accounts
- `email`, `phone`, `name`
- `role`: 'commuter' | 'driver' | 'both'
- `rating`, `createdAt`

**drivers/** - Driver profiles
- `userId` (reference to users/)
- `isAvailable`, `isVerified`
- `vehicleInfo` (make, model, year, licensePlate, towingCapacity)
- `serviceRadius` (miles)
- `currentLocation` (geopoint)
- `documents` (driversLicense, insurance, registration URLs)

**requests/** - Service requests from commuters
- `commuterId`, `location`, `address`
- `serviceType`: 'tow' (simplified for MVP)
- `status`: 'searching' | 'matched' | 'accepted' | 'cancelled'
- `matchedDriverId`, `createdAt`, `expiresAt`

**trips/** - Active and completed trips
- `requestId`, `commuterId`, `driverId`
- `status`: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
- `pickupLocation`, `dropoffLocation`
- `startTime`, `arrivalTime`, `completionTime`
- `distance`, `estimatedPrice`, `finalPrice`
- `driverPath` (array of geopoints for replay)

**driverLocations/** - Ephemeral real-time locations (cleared frequently)
- `location`, `heading`, `speed`, `accuracy`, `timestamp`

### Key Architectural Patterns

#### 1. Role-Based Navigation
Users can toggle between Commuter and Driver modes. Navigation structure changes dynamically based on active role using Expo Router groups:
- Auth screens shown when not authenticated
- Role-specific tab navigators shown when authenticated
- Role switching handled via user profile/settings

#### 2. Real-Time Location System
**Driver Side:**
- When driver goes "online", start background location tracking (every 5-10 seconds)
- Update `driverLocations/{driverId}` in Firestore
- Use expo-location with background permissions
- Handle iOS/Android battery optimization differences

**Commuter Side:**
- During active trip, subscribe to matched driver's location
- Update ETA based on route recalculation
- Show driver moving on map in real-time

**Implementation:**
```typescript
// services/location/tracking.ts
- startDriverTracking() - Begin background updates
- stopDriverTracking() - Clean up on offline
- updateDriverLocation() - Write to Firestore
```

#### 3. Request Matching Algorithm
**Flow:**
1. Commuter creates request → writes to `requests/` collection
2. Cloud Function (or client-side logic) queries nearby drivers:
   - Filter by `isAvailable === true`
   - Filter by `serviceRadius` (geohash/geopoint query)
   - Sort by distance from request location
3. Notify closest driver first (FCM push notification)
4. 30-second timeout for response
5. If rejected/timeout, notify next closest driver
6. On acceptance, update request status to 'matched' and create trip document

**Key challenges:**
- Prevent race conditions (use Firestore transactions)
- Handle concurrent requests to same driver
- Efficient geospatial queries (use geohash library like geofire-common)

#### 4. Trip State Machine
```
searching → matched → accepted → en_route → arrived → in_progress → completed
                 ↓
              cancelled (from any state)
```

Each state transition:
- Updates trip document
- Sends notification to other party
- Updates UI on both sides
- May trigger location tracking start/stop

#### 5. Theme System (Inherited from Expo Template)
- `constants/theme.ts` - Centralized colors/fonts for light/dark mode
- `useColorScheme()` - Detects system theme
- `useThemeColor()` - Returns themed colors with overrides
- All custom components should extend themed components

### Path Aliases
```typescript
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { Trip } from '@/types/models';
import { createTrip } from '@/services/firebase/firestore';
```

## Critical Technical Considerations

### Real-Time Performance
- **Location updates**: Every 5-10 seconds for online drivers (balance accuracy vs battery/quota)
- **Firestore listeners**: Use efficient queries with `.where()` and `.limit()`
- **Firebase quotas**: Free tier has read/write limits - monitor usage closely
- **Battery optimization**: Educate drivers about battery impact, implement smart throttling

### Platform-Specific Code
Use file extensions for platform differences:
- `.ios.tsx` - iOS-only (SF Symbols, background location)
- `.android.tsx` - Android-only (Material Icons, foreground service)
- `.web.ts` - Web fallback (limited functionality)
- `.tsx` - Shared implementation

### Security (Firestore Rules)
```javascript
// Critical rules to implement:
- Drivers can only update their own availability/location
- Commuters can only create requests with their own userId
- Trip updates must follow valid state transitions
- Location data is only readable by involved parties
- Driver documents only readable by admins (future)
```

### Location Permissions
**iOS:**
- Request "While Using" first, then "Always" for background tracking
- Add `NSLocationAlwaysAndWhenInUseUsageDescription` to app.json
- Explain clearly why always-on location is needed

**Android:**
- Request FOREGROUND location, then BACKGROUND separately
- Use foreground service notification for driver tracking
- Handle Doze mode and battery optimization

### Edge Cases to Handle
1. **No drivers available** - Show message, retry search, expand radius
2. **Driver goes offline mid-trip** - Notify commuter, allow reassignment
3. **GPS signal loss** - Use last known location, show accuracy indicator
4. **Network interruption** - Queue updates, sync when reconnected
5. **Concurrent acceptance** - Use Firestore transactions to prevent
6. **Request timeout** - Auto-cancel after 10 minutes if no driver
7. **Driver spam cancellations** - Track cancellation rate, temp suspension

## Development Phases

### Phase 1: Proof of Concept ✅ COMPLETE
**Status:** Complete - Working real-time request/trip lifecycle

**What Was Built:**
- ✅ Firebase project setup and configuration
- ✅ Firestore integration with real-time listeners
- ✅ Core services: `createRequest()`, `listenForRequests()`, `acceptRequest()`, `updateTripStatus()`
- ✅ TypeScript type definitions for all data models
- ✅ POC test screen demonstrating full flow
- ✅ Two-device real-time synchronization working

**Demo Capabilities:**
- Commuter creates request → Driver sees it instantly
- Driver accepts → Trip created, both sides update
- Driver updates status → Commuter sees changes in real-time

---

### Phase 2: Maps & Core UI (CURRENT)
**Goal:** Add maps and build basic functional screens

**Tasks:**
- [ ] Install and configure react-native-maps
- [ ] Create map component showing pickup/dropoff pins
- [ ] Build commuter request screen (map + bottom sheet)
- [ ] Build driver dashboard screen (map + request list)
- [ ] Add role selector screen
- [ ] Integrate UI with existing Firestore functions
- [ ] Basic styling (using teammate's Figma designs)

**Deliverable:** Functional app with map interface (Uber-style with sliding panels)

---

### Phase 3: Location Tracking & Matching
**Goal:** Add real-time GPS tracking and smart driver matching

**Tasks:**
- [ ] Implement GPS location tracking (expo-location)
- [ ] Update driver location to Firestore every 10 seconds
- [ ] Display driver location on commuter's map
- [ ] Calculate and display ETA
- [ ] Add distance calculation for pricing
- [ ] Implement basic geospatial queries (find nearby drivers)
- [ ] Add route display on map

**Deliverable:** Live driver tracking with dynamic pricing

---

### Phase 4: Production Features & Polish
**Goal:** Make it production-ready

**Tasks:**
- [ ] Full authentication system (email/password)
- [ ] User profiles and settings
- [ ] Trip history
- [ ] Rating system
- [ ] Push notifications (FCM)
- [ ] Error handling and edge cases
- [ ] Offline support
- [ ] Performance optimization
- [ ] Comprehensive testing

**Deliverable:** Production-ready app for beta testing

---

### Phase 5: Advanced Features (Future/Optional)
**Goal:** Enterprise features

**Tasks:**
- [ ] Stripe payment integration
- [ ] Driver verification workflow
- [ ] Admin dashboard (web)
- [ ] Analytics and reporting
- [ ] In-app chat
- [ ] Multi-service support (jumpstart, tire change, etc.)

**Deliverable:** Full-featured marketplace platform

## Recommended Libraries

### Must-Have
```json
{
  "firebase": "^10.x",
  "react-native-maps": "^1.x",
  "expo-location": "~18.x",
  "expo-notifications": "~0.x",
  "@react-native-async-storage/async-storage": "^1.x",
  "geofire-common": "^6.x"  // For geospatial queries
}
```

### Nice-to-Have
```json
{
  "react-hook-form": "^7.x",  // Form validation
  "zustand": "^4.x",  // Lightweight state management (alternative to Context)
  "react-native-reanimated": "~4.x",  // Already included - for animations
  "react-native-gesture-handler": "~2.x"  // Already included
}
```

## Code Style & Best Practices

### This is a graded capstone project - maintain high standards:

1. **Comments**: Explain WHY, not WHAT
   ```typescript
   // ✅ GOOD: Explain business logic
   // Use transaction to prevent race condition where multiple drivers
   // could accept the same request simultaneously
   await runTransaction(db, async (transaction) => { ... });

   // ❌ BAD: State the obvious
   // Set isAvailable to true
   driver.isAvailable = true;
   ```

2. **Error Handling**: Always handle failures gracefully
   - Wrap Firebase calls in try/catch
   - Show user-friendly error messages
   - Log errors for debugging but don't expose internals
   - Have fallback UI for failed states

3. **TypeScript**: Use proper types, avoid `any`
   ```typescript
   // Define clear interfaces in types/models.ts
   interface Driver {
     userId: string;
     isAvailable: boolean;
     currentLocation: { latitude: number; longitude: number };
     // ...
   }
   ```

4. **File Organization**: One component per file, clear naming
   - `CommutterRequestScreen.tsx` not `Screen1.tsx`
   - `DriverMarker.tsx` not `Marker.tsx`
   - `useDriverLocation.ts` not `useLocation.ts` (too generic)

5. **Git Commits**: Professional, descriptive messages
   ```
   ✅ "feat: implement driver location tracking with 10s updates"
   ✅ "fix: prevent duplicate trip acceptance using Firestore transaction"
   ❌ "changes"
   ❌ "fix stuff"
   ```

## Firebase Setup Notes

### Environment Variables
Never commit Firebase config directly. Use:
```typescript
// app.config.js (or app.json with extra field)
export default {
  expo: {
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      // ... other config
    }
  }
}
```

### Firestore Indexes
You'll need composite indexes for queries like:
```javascript
// Query: Find available drivers near location within radius
drivers
  .where('isAvailable', '==', true)
  .where('geohash', '>=', geohashStart)
  .where('geohash', '<=', geohashEnd)
```
Firestore will prompt you to create indexes when queries fail - follow the provided link.

## Testing Strategy

### Manual Testing Checklist (For Demos)
- [ ] Create account as commuter
- [ ] Create account as driver (with vehicle info)
- [ ] Toggle driver availability online
- [ ] Create request as commuter
- [ ] Receive notification as driver
- [ ] Accept request (verify only one driver can accept)
- [ ] Track driver location in real-time as commuter
- [ ] Progress through trip states (en route → arrived → in progress → completed)
- [ ] View completed trip in history
- [ ] Test offline behavior (airplane mode)
- [ ] Test GPS disable/enable mid-trip
- [ ] Test app backgrounding during active trip

### Team Contribution Guidelines
- Create feature branches from `main`
- Use descriptive branch names: `feature/driver-location-tracking`
- Open PRs for code review before merging
- Test on both iOS and Android before PR
- Update JIRA tickets as you progress

## SCRUM/JIRA Integration

Each user story should map to:
- **Epic** (e.g., "Trip Management")
- **Story** (e.g., "As a driver, I can mark myself as arrived")
- **Tasks** (e.g., "Create arrived button UI", "Update Firestore trip status", "Send push notification to commuter")
- **Acceptance Criteria** (testable conditions)
- **Story Points** (estimate effort)

Track velocity each sprint to predict semester timeline.

## Common Pitfalls to Avoid

1. **Expo Go Limitations**: Expo Go doesn't support background location or some native modules. Use **development build** (`npx expo run:android` / `npx expo run:ios`) for full functionality.

2. **Firebase Quota Overage**: Inefficient queries or too-frequent updates can blow free tier limits. Monitor Firebase console usage.

3. **Location Accuracy**: GPS can be 5-50m off, especially indoors. Use accuracy threshold checks.

4. **State Management Complexity**: Don't over-engineer. Start with Context API, only add Zustand/Redux if truly needed.

5. **Hardcoded Values**: Use `constants/config.ts` for timeouts, radii, update intervals - easier to tune later.

6. **Neglecting iOS/Android Differences**: Test platform-specific features (permissions, background tasks) on both OSes early.

## Questions Answered

**Q: Should I use Expo Go or development build?**
A: Development build. You need background location tracking, which Expo Go doesn't support.

**Q: Best folder structure?**
A: See "Application Structure" above - separates screens (app/), reusable UI (components/), business logic (services/), and state (contexts/, hooks/).

**Q: How to organize Firebase calls?**
A: Create service modules in `services/firebase/` that export functions like `createRequest()`, `updateTripStatus()`. Import these in components/hooks. Never call Firebase directly from UI code.

**Q: Context API or Redux?**
A: Start with Context API for auth and active trip state. It's simpler and sufficient for this app size. Only add Zustand if state updates cause performance issues.

**Q: Best way to handle real-time location updates?**
A: Use expo-location's `startLocationUpdatesAsync()` with `timeInterval: 10000` (10 seconds). Write to Firestore in batches if possible to reduce writes. See `services/location/tracking.ts`.

**Q: Cloud Function vs client-side matching?**
A: Start client-side for simplicity (Cloud Functions require paid Firebase plan). Commuter's device can query nearby drivers directly. Move to Cloud Functions in Phase 4 for better security and control.

**Q: Recommended libraries?**
A: See "Recommended Libraries" section above. Focus on firebase, react-native-maps, expo-location, and geofire-common for MVP.

## Working with Claude Code on This Project

**IMPORTANT: This is an educational capstone project.** The student is learning React Native, Firebase, and mobile development. Claude Code should act as a **coaching mentor**, not an automation tool.

### Coaching Guidelines for Claude Code:

1. **Guide, Don't Do**
   - Explain WHY before showing HOW
   - Break down complex tasks into learning steps
   - Ask the student to try implementing first, then review
   - Point to documentation and learning resources
   - Encourage experimentation and debugging

2. **Teach Through Questions**
   - "What do you think will happen if...?"
   - "How would you approach this problem?"
   - "What error is this telling you?"
   - Help the student develop problem-solving skills

3. **Code Review Over Code Generation**
   - When the student writes code, review it constructively
   - Explain best practices and why they matter
   - Suggest improvements but let the student implement
   - Point out potential bugs or edge cases

4. **Explain Concepts Thoroughly**
   - Use analogies and examples
   - Draw connections to what they already know
   - Explain the "big picture" before diving into implementation
   - Relate technical decisions to real-world impact

5. **Encourage Professional Practices**
   - This is graded work - remind them to commit with good messages
   - Suggest when to test on device vs simulator
   - Point out when something should be a separate JIRA ticket
   - Help them develop good development habits

### Example Interaction Style:

**❌ BAD (Too automated):**
```
I'll install Firebase for you. [runs npm install]
I've created the auth service. [writes entire file]
```

**✅ GOOD (Coaching approach):**
```
Let's install Firebase together. Here's the command you'll need:
  npm install firebase

This will add Firebase SDK to your project. Once it finishes, we'll
need to configure it. Do you have your Firebase project set up yet?
If not, I can walk you through that first.

After installation, you'll see it added to package.json. Check that
file and let me know what version was installed.
```

### When to Actually Write Code:

- **Boilerplate/Config**: Okay to generate initial setup files (tsconfig, eslint rules)
- **TypeScript Types**: Okay to create type definitions based on discussed schema
- **Example Implementations**: Provide ONE example, then ask student to implement similar patterns
- **Debugging**: After the student tries, okay to fix critical blockers if explained thoroughly

### Learning Checkpoints:

Before moving to the next feature, ensure the student understands:
- What problem this code solves
- How it fits into the larger architecture
- What happens if it fails
- How to test it manually
- How it would be extended later

## Current Status

**Phase 1 - Proof of Concept COMPLETE! ✅**

**Phase 2 - Maps & Core UI (IN PROGRESS) 🚧**

### What's Been Built:

**Core Infrastructure:**
- ✅ Firebase project created and configured
- ✅ Expo app with proper project structure
- ✅ Firebase SDK installed with React Native AsyncStorage persistence
- ✅ TypeScript type definitions for all data models (User, Driver, Request, Trip, VehicleInfo, Location, etc.)
- ✅ Services layer architecture (separation of concerns)

**Firestore Operations (`services/firebase/firestore.ts`):**
- ✅ `createRequest()` - Commuter creates tow request
- ✅ `listenForRequests()` - Real-time listener for pending requests
- ✅ `acceptRequest()` - Driver accepts request, creates trip
- ✅ `updateTripStatus()` - Update trip status with timestamps

**Real-Time Functionality:**
- ✅ Two-device communication via Firestore
- ✅ Instant updates using `onSnapshot` listeners
- ✅ Request lifecycle: searching → accepted → trip created
- ✅ Trip lifecycle: en_route → arrived → in_progress → completed

**Working Demo Flow:**
1. Commuter creates request → Writes to Firestore
2. Driver sees request appear in real-time (no refresh!)
3. Driver accepts → Request updated, Trip created
4. Driver updates status through lifecycle
5. UI updates automatically based on trip state

**Technical Learnings Completed:**
- ✅ Firebase configuration and setup
- ✅ Firestore read/write operations
- ✅ Real-time listeners and subscriptions
- ✅ React hooks (useState, useEffect)
- ✅ TypeScript type safety
- ✅ Async/await patterns
- ✅ Error handling with try/catch
- ✅ Google Maps API integration
- ✅ expo-location GPS tracking
- ✅ Environment variables for API keys
- ✅ MapView component with markers
- ✅ React Native StyleSheet styling

**Phase 2 Progress (Maps & Core UI):**
- ✅ react-native-maps installed and configured
- ✅ Google Maps API key secured with environment variables
- ✅ Commuter Request Screen (`app/(tabs)/commuter.tsx`) built with:
  - Full-screen map with user's GPS location
  - Auto-location detection on screen load
  - Location centering button
  - "Request Roadside Assistance" button (connected to Firebase)
  - Service type selector (Towing highlighted, others disabled)
  - Real-time request creation working
- [ ] Driver Dashboard Screen (next up!)
- [ ] Route display between pickup/dropoff
- [ ] Real-time driver location tracking during trip

### What's NOT Built Yet (Future Phases):

**Phase 2 - Still TODO:**
- [ ] Driver Dashboard Screen with map and request list
- [ ] Available/Offline toggle for drivers
- [ ] Accept/Reject request functionality in UI
- [ ] Trip tracking view for commuters

**Phase 3 - Smart Matching:**
- [ ] Geospatial queries (find nearby drivers)
- [ ] Matching algorithm (notify closest driver first)
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] Request timeout handling
- [ ] Multiple driver handling
- [ ] ETA calculations
- [ ] Route calculation and display

**Phase 4 - Polish & Production:**
- [ ] Full authentication system (signup/login screens)
- [ ] Role-based navigation (commuter vs driver modes)
- [ ] Trip history and analytics
- [ ] Rating system
- [ ] Payment integration (Stripe)
- [ ] Driver verification workflow

### Next Immediate Steps (Phase 2 - Maps & Core UI):

Following the phase plan above, here are the concrete next steps:

1. **Set up react-native-maps**
   - Install react-native-maps package
   - Configure Google Maps API key in app.json
   - Create basic MapView component that displays

2. **Build Commuter Request Screen**
   - Map with current location centered
   - Pickup/dropoff address input fields (or draggable map pins)
   - "Request Tow" button
   - Bottom sheet UI pattern (map + overlay)

3. **Build Driver Dashboard Screen**
   - Map showing driver's current location
   - Available/Offline toggle switch
   - List of incoming requests (from Firestore listener)
   - Accept/Reject buttons for each request

4. **Test Maps on Both Platforms**
   - Verify map renders on iOS simulator
   - Verify map renders on Android emulator
   - Test address input functionality
   - Test pin placement on map

### Files Created:

**Configuration:**
- `services/firebase/config.ts` - Firebase initialization with AsyncStorage persistence
- `app.config.js` - Expo config with environment variables for API keys
- `.env` - Environment variables (Google Maps API key) - **NOT committed to git**
- `.env.example` - Template showing required environment variables

**Data Layer:**
- `types/models.ts` - TypeScript interfaces (User, Driver, Request, Trip, etc.)
- `services/firebase/firestore.ts` - All Firestore operations

**Screens:**
- `app/(tabs)/index.tsx` - POC test screen with working demo
- `app/(tabs)/commuter.tsx` - Commuter request screen with map and location

### Known Issues/Limitations:

**Current POC Limitations:**
- Location coordinates hardcoded to (0, 0) - will integrate actual GPS in Phase 2
- Single test screen with buttons - will build proper UI screens in Phase 2
- No authentication system - using hardcoded user IDs ("test-commuter-000", "test-driver-000")
- No distance/price calculation - hardcoded to $75 (will calculate based on route in Phase 3)
- Service type simplified to 'tow' only (intentional design decision)
- No map visualization - will add react-native-maps in Phase 2

**These are expected for a POC** - the goal was to prove Firebase real-time sync works, which it does!
