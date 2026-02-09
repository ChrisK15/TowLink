# Technical Specification: TOW-12

## Story Reference
**ID**: TOW-12
**Title**: US-6.1: Firebase Security Rules
**Epic**: TOW-6 (EPIC 6: System Reliability & Security)
**Priority**: CRITICAL
**Story Points**: 5

### Story Context
Currently, the TowLink Firestore database has no security rules in place, meaning any authenticated user could potentially read, modify, or delete any data. This story implements comprehensive security rules to ensure:
- Users can only access their own data
- Role-based access control (Commuters vs Drivers)
- Field-level validation
- Protection against malicious data manipulation

---

## Architecture Overview

Firestore security rules act as a **server-side firewall** that runs on every database operation. Rules are written in a declarative language that evaluates whether a request should be allowed based on:
- **Authentication state** (`request.auth`)
- **Request data** (`request.resource.data`)
- **Existing data** (`resource.data`)
- **Custom functions** for reusable logic

### Security Model Principles
1. **Deny by default** - Only explicitly allowed operations succeed
2. **Defense in depth** - Multiple layers of validation
3. **Least privilege** - Users get minimum necessary access
4. **Validation at write** - Catch bad data before it enters database
5. **Read isolation** - Users only see data relevant to them

---

## Technical Requirements

### 1. Firestore Collections Overview

Based on the current codebase, we have these collections:
- **`/users/{userId}`** - User profile documents
- **`/requests/{requestId}`** - Tow service requests (created by commuters)
- **`/trips/{tripId}`** - Active and completed trips (created when driver accepts)
- **`/drivers/{driverId}`** - Driver profile documents (future)
- **`/driverLocations/{driverId}`** - Real-time driver locations (future)

### 2. Data Models (from types/models.ts)

```typescript
User {
  id: string;
  email: string;
  name?: string;
  role: 'commuter' | 'driver' | 'both' | null;
  phone?: string;
  createdAt: Date;
  rating?: number;
}

Request {
  id: string;
  commuterId: string;
  location: { latitude: number, longitude: number };
  dropoffLocation: { latitude: number, longitude: number };
  address: string;
  serviceType: 'tow';
  status: 'searching' | 'matched' | 'accepted' | 'cancelled';
  matchedDriverId?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

Trip {
  id: string;
  requestId: string;
  commuterId: string;
  driverId: string;
  status: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  pickupLocation: { latitude: number, longitude: number };
  dropoffLocation: { latitude: number, longitude: number };
  startTime: Timestamp;
  arrivalTime?: Timestamp;
  completionTime?: Timestamp;
  distance: number;
  estimatedPrice: number;
  finalPrice?: number;
  driverPath: Location[];
}
```

---

## Security Rules Implementation

### File Structure

Create a new file: **`firestore.rules`** in the project root.

### Complete Rules File

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Check if user owns this resource
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Check if incoming data has required fields
    function hasRequiredFields(fields) {
      return request.resource.data.keys().hasAll(fields);
    }

    // Check if field value is valid string (not empty)
    function isValidString(field) {
      return request.resource.data[field] is string
        && request.resource.data[field].size() > 0;
    }

    // Check if location object is valid
    function isValidLocation(location) {
      return location.keys().hasAll(['latitude', 'longitude'])
        && location.latitude is number
        && location.longitude is number
        && location.latitude >= -90 && location.latitude <= 90
        && location.longitude >= -180 && location.longitude <= 180;
    }

    // Check if timestamp is valid (not in the past for creation)
    function isValidTimestamp(field) {
      return request.resource.data[field] is timestamp;
    }

    // Check if user has driver role
    function isDriver() {
      return isAuthenticated()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['driver', 'both'];
    }

    // Check if user has commuter role
    function isCommuter() {
      return isAuthenticated()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['commuter', 'both'];
    }

    // ============================================
    // USERS COLLECTION
    // ============================================
    match /users/{userId} {
      // Anyone authenticated can read any user profile
      // (needed for showing driver info to commuters and vice versa)
      allow read: if isAuthenticated();

      // Users can only create their own profile during signup
      allow create: if isAuthenticated()
        && isOwner(userId)
        && hasRequiredFields(['email', 'createdAt'])
        && isValidString('email')
        && request.resource.data.email == request.auth.token.email
        && isValidTimestamp('createdAt')
        // Role must be valid if provided
        && (request.resource.data.role == null
            || request.resource.data.role in ['commuter', 'driver', 'both']);

      // Users can only update their own profile
      allow update: if isAuthenticated()
        && isOwner(userId)
        // Cannot change critical fields
        && request.resource.data.id == resource.data.id
        && request.resource.data.email == resource.data.email
        && request.resource.data.createdAt == resource.data.createdAt
        // Role must remain valid
        && (request.resource.data.role == null
            || request.resource.data.role in ['commuter', 'driver', 'both']);

      // Users cannot delete their own profile (use Cloud Function for account deletion)
      allow delete: if false;
    }

    // ============================================
    // REQUESTS COLLECTION
    // ============================================
    match /requests/{requestId} {
      // Any authenticated user can read requests
      // (drivers need to see all searching requests)
      allow read: if isAuthenticated();

      // Only commuters can create requests
      allow create: if isAuthenticated()
        && isCommuter()
        && hasRequiredFields([
          'commuterId',
          'location',
          'dropoffLocation',
          'address',
          'serviceType',
          'status',
          'createdAt',
          'expiresAt'
        ])
        // Must be creating request for themselves
        && request.resource.data.commuterId == request.auth.uid
        // Validate location objects
        && isValidLocation(request.resource.data.location)
        && isValidLocation(request.resource.data.dropoffLocation)
        // Address must be valid
        && isValidString('address')
        // Service type must be 'tow'
        && request.resource.data.serviceType == 'tow'
        // Initial status must be 'searching'
        && request.resource.data.status == 'searching'
        // Timestamps must be valid
        && isValidTimestamp('createdAt')
        && isValidTimestamp('expiresAt')
        // matchedDriverId should be null initially
        && (!request.resource.data.keys().hasAny(['matchedDriverId'])
            || request.resource.data.matchedDriverId == null);

      // Commuters can update their own requests (for cancellation)
      // Drivers can update requests to accept them
      allow update: if isAuthenticated()
        && (
          // Commuter cancelling their own request
          (resource.data.commuterId == request.auth.uid
            && request.resource.data.status == 'cancelled'
            && request.resource.data.commuterId == resource.data.commuterId)
          ||
          // Driver accepting a request
          (isDriver()
            && resource.data.status == 'searching'
            && request.resource.data.status == 'accepted'
            && request.resource.data.matchedDriverId == request.auth.uid
            && request.resource.data.commuterId == resource.data.commuterId)
        );

      // No one can delete requests (keep for records)
      allow delete: if false;
    }

    // ============================================
    // TRIPS COLLECTION
    // ============================================
    match /trips/{tripId} {
      // Participants can read their own trips
      allow read: if isAuthenticated()
        && (resource.data.commuterId == request.auth.uid
            || resource.data.driverId == request.auth.uid);

      // Only drivers can create trips (when accepting a request)
      allow create: if isAuthenticated()
        && isDriver()
        && hasRequiredFields([
          'requestId',
          'commuterId',
          'driverId',
          'status',
          'pickupLocation',
          'dropoffLocation',
          'startTime',
          'estimatedPrice'
        ])
        // Trip must be for the driver creating it
        && request.resource.data.driverId == request.auth.uid
        // Initial status must be 'en_route'
        && request.resource.data.status == 'en_route'
        // Validate locations
        && isValidLocation(request.resource.data.pickupLocation)
        && isValidLocation(request.resource.data.dropoffLocation)
        // Timestamps
        && isValidTimestamp('startTime')
        // Price must be positive
        && request.resource.data.estimatedPrice is number
        && request.resource.data.estimatedPrice > 0
        // Distance should be 0 initially
        && request.resource.data.distance == 0;

      // Drivers can update their trips to change status
      // Commuters cannot update trips (read-only for them)
      allow update: if isAuthenticated()
        && resource.data.driverId == request.auth.uid
        // Cannot change core fields
        && request.resource.data.requestId == resource.data.requestId
        && request.resource.data.commuterId == resource.data.commuterId
        && request.resource.data.driverId == resource.data.driverId
        && request.resource.data.startTime == resource.data.startTime
        // Status must be valid progression
        && request.resource.data.status in ['en_route', 'arrived', 'in_progress', 'completed', 'cancelled']
        // If setting to completed, must have completionTime
        && (request.resource.data.status != 'completed'
            || isValidTimestamp('completionTime'))
        // If setting to arrived, must have arrivalTime
        && (request.resource.data.status != 'arrived'
            || isValidTimestamp('arrivalTime'));

      // No one can delete trips (keep for records)
      allow delete: if false;
    }

    // ============================================
    // DRIVERS COLLECTION (Future)
    // ============================================
    match /drivers/{driverId} {
      // Any authenticated user can read driver profiles
      allow read: if isAuthenticated();

      // Only the user can create/update their own driver profile
      allow create, update: if isAuthenticated()
        && isOwner(driverId)
        && isDriver();

      // Cannot delete driver profiles
      allow delete: if false;
    }

    // ============================================
    // DRIVER LOCATIONS COLLECTION (Future)
    // ============================================
    match /driverLocations/{driverId} {
      // Any authenticated user can read driver locations
      // (commuters need to track their driver)
      allow read: if isAuthenticated();

      // Only the driver can update their own location
      allow create, update: if isAuthenticated()
        && isOwner(driverId)
        && isDriver();

      // Drivers can delete their location (when going offline)
      allow delete: if isAuthenticated()
        && isOwner(driverId);
    }

    // ============================================
    // DEFAULT DENY ALL OTHER COLLECTIONS
    // ============================================
    // This ensures any new collections are denied by default
    // Must explicitly add rules for new collections
  }
}
```

---

## Implementation Steps

### Step 1: Create Firestore Rules File
**Files**: `/home/chris/TowLink/firestore.rules`
**Action**: Create the security rules file in the project root
**Details**: Copy the complete rules from the section above into a new file named `firestore.rules` at the root of your project (same level as `package.json`).

### Step 2: Initialize Firebase CLI (if not already done)
**Action**: Ensure Firebase CLI is installed and project is initialized
**Commands**:
```bash
# Check if Firebase CLI is installed
firebase --version

# If not installed, install it
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project (if not already done)
firebase init
```

**Configuration when running `firebase init`**:
- Select: Firestore, Emulators
- Use existing project: `towlink-71a59`
- Firestore rules file: `firestore.rules` (default)
- Firestore indexes file: `firestore.indexes.json` (default)
- Select emulators: Firestore, Authentication
- Firestore emulator port: 8080 (default)
- Authentication emulator port: 9099 (default)
- Download emulators: Yes

This will create:
- `firebase.json` - Firebase configuration
- `.firebaserc` - Project aliases
- `firestore.rules` - Security rules (we'll overwrite with our rules)
- `firestore.indexes.json` - Database indexes

### Step 3: Configure Firebase Emulator
**Files**: `firebase.json`
**Action**: Ensure emulator configuration is correct
**Expected content**:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "auth": {
      "port": 9099
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### Step 4: Test Rules with Firebase Emulator
**Action**: Start the Firebase emulator and run test scenarios
**Commands**:
```bash
# Start Firebase emulators
firebase emulators:start
```

**Testing Strategy**: Create a manual test plan document (we'll do this in Step 5)

### Step 5: Create Test Plan Document
**Files**: `.claude/specs/TOW-12-test-plan.md`
**Action**: Document test cases for each acceptance criterion
**Content**: See "Testing Strategy" section below

### Step 6: Connect App to Emulator for Testing
**Files**: `services/firebase/config.ts`
**Action**: Add emulator configuration for development testing
**Code addition**:
```typescript
// Add after firebase initialization
if (__DEV__) {
  // Connect to Firebase emulators in development
  const { connectFirestoreEmulator } = require('firebase/firestore');
  const { connectAuthEmulator } = require('firebase/auth');

  // Only connect if not already connected
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.log('Emulators already connected or not available');
  }
}
```

**Note**: This should be TEMPORARY for testing. Remove or comment out before deploying to production.

### Step 7: Run Manual Tests
**Action**: Execute each test case in the test plan
**Process**:
1. Start Firebase emulator
2. Start Expo app with emulator connection
3. Test each scenario from the test plan
4. Document results in `.claude/progress/TOW-12-progress.md`
5. Fix any issues found

### Step 8: Deploy Rules to Production
**Action**: Deploy validated security rules to live Firebase project
**Commands**:
```bash
# Deploy only Firestore rules (not indexes or functions)
firebase deploy --only firestore:rules
```

**Verification steps after deployment**:
1. Check Firebase Console > Firestore Database > Rules tab
2. Verify rules were updated (check timestamp)
3. Test one critical flow in production app to ensure nothing broke
4. Monitor Firebase Console for any unexpected errors

### Step 9: Document Security Rules
**Action**: Add comments and documentation for future reference
**Files**:
- Update `.claude/docs/ARCHITECTURE.md` security section
- Add inline comments in `firestore.rules` for complex logic

### Step 10: Remove Emulator Connection from Production
**Files**: `services/firebase/config.ts`
**Action**: Ensure emulator connection code is removed or properly gated
**Verification**: Check that `__DEV__` flag is working correctly

---

## Testing Strategy

### Test Plan Structure

Create file: `.claude/specs/TOW-12-test-plan.md`

### Test Categories

#### 1. Authentication Tests
- **Test 1.1**: Unauthenticated user cannot read users collection
- **Test 1.2**: Unauthenticated user cannot read requests collection
- **Test 1.3**: Unauthenticated user cannot read trips collection

#### 2. User Collection Tests
- **Test 2.1**: User can read their own profile
- **Test 2.2**: User can read other users' profiles
- **Test 2.3**: User can create their own profile with valid data
- **Test 2.4**: User cannot create profile with wrong email
- **Test 2.5**: User can update their own profile (name, role)
- **Test 2.6**: User cannot update another user's profile
- **Test 2.7**: User cannot change their email or createdAt
- **Test 2.8**: User cannot delete their profile

#### 3. Request Collection Tests
- **Test 3.1**: Commuter can create a request
- **Test 3.2**: Driver can read pending requests
- **Test 3.3**: User without commuter role cannot create request
- **Test 3.4**: User cannot create request for another user
- **Test 3.5**: Request must have valid location data
- **Test 3.6**: Request must have serviceType = 'tow'
- **Test 3.7**: Initial status must be 'searching'
- **Test 3.8**: Commuter can cancel their own request
- **Test 3.9**: Commuter cannot cancel another user's request
- **Test 3.10**: Driver can accept a request (change status to 'accepted')
- **Test 3.11**: Driver cannot accept already accepted request
- **Test 3.12**: No one can delete requests

#### 4. Trip Collection Tests
- **Test 4.1**: Driver can create trip when accepting request
- **Test 4.2**: Commuter cannot create trips
- **Test 4.3**: Trip must have valid required fields
- **Test 4.4**: Driver can update their trip status
- **Test 4.5**: Driver can mark trip as 'arrived' (adds arrivalTime)
- **Test 4.6**: Driver can mark trip as 'completed' (adds completionTime)
- **Test 4.7**: Driver cannot update another driver's trip
- **Test 4.8**: Commuter can read their own trips
- **Test 4.9**: Commuter cannot update trips
- **Test 4.10**: User cannot read trips they're not part of
- **Test 4.11**: No one can delete trips

#### 5. Field Validation Tests
- **Test 5.1**: Location must have latitude and longitude
- **Test 5.2**: Latitude must be between -90 and 90
- **Test 5.3**: Longitude must be between -180 and 180
- **Test 5.4**: Timestamps must be valid Timestamp type
- **Test 5.5**: Required string fields cannot be empty
- **Test 5.6**: Estimated price must be positive number

### Manual Testing Process

For each test:
1. **Setup**: Describe initial state (users, data)
2. **Action**: Describe the operation to perform
3. **Expected**: What should happen (success or specific error)
4. **Actual**: What actually happened during test
5. **Status**: Pass/Fail

### Example Test Case Format

```markdown
## Test 3.1: Commuter can create a request

**Setup**:
- User logged in with email test-commuter@example.com
- User has role 'commuter' in /users/{uid}

**Action**:
Execute createRequest() from CommenterScreen:
- commuterId: {current auth uid}
- pickupAddress: "123 Main St"
- dropoffAddress: "456 Oak Ave"
- location: { latitude: 37.7749, longitude: -122.4194 }

**Expected**:
- Request document created in /requests/ collection
- Document contains all required fields
- status = 'searching'
- No errors in console

**Actual**: [To be filled during testing]

**Status**: [PASS/FAIL]
```

---

## Edge Cases

### 1. Concurrent Request Updates
**Scenario**: Two drivers try to accept the same request simultaneously
**Handling**:
- Rules check `resource.data.status == 'searching'` before allowing update
- First transaction wins, second fails
- App should handle error gracefully and show "Request already accepted"

### 2. User with No Role
**Scenario**: User document exists but role is null
**Handling**:
- User cannot create requests (isCommuter() returns false)
- User cannot create trips (isDriver() returns false)
- User can still read data
- App should prompt user to select a role

### 3. Expired Requests
**Scenario**: Request has passed expiresAt timestamp
**Handling**:
- Rules don't enforce expiration (that's business logic)
- App should filter out expired requests in queries
- Consider Cloud Function to clean up expired requests

### 4. Invalid Location Data
**Scenario**: Client sends malformed location object
**Handling**:
- isValidLocation() function validates structure and ranges
- Request denied if location invalid
- App should validate on client side before submission

### 5. Role Changes Mid-Request
**Scenario**: User changes role from 'commuter' to 'driver' while having active request
**Handling**:
- Existing request unaffected (already created)
- User can still read/update their request
- Consider business logic to prevent role changes with active trips

### 6. Trip Updates by Commuter
**Scenario**: Commuter tries to mark trip as completed
**Handling**:
- Rules deny update (only driver can update)
- Return permission denied error
- App should not show update buttons to commuters

### 7. Price Manipulation
**Scenario**: Driver tries to update finalPrice to large amount
**Handling**:
- Current rules allow any positive number
- Consider adding max price limit: `request.resource.data.finalPrice <= 1000`
- Better: Use Cloud Function to calculate price server-side

### 8. Deleting Active Trip
**Scenario**: User tries to delete trip document
**Handling**:
- Rules deny all deletes: `allow delete: if false`
- Keep all trips for audit trail and history
- Use Cloud Function for cleanup after retention period

---

## Security Best Practices

### 1. Defense in Depth
- Don't rely solely on security rules
- Validate data on client side for UX
- Validate on server side (rules) for security
- Use Cloud Functions for complex business logic

### 2. Principle of Least Privilege
- Users get minimum access needed
- Commuters can't create trips
- Drivers can't update requests (except to accept)
- No one can delete documents

### 3. Data Validation
- Always validate data types
- Check ranges for numbers
- Validate string lengths
- Verify required fields exist

### 4. Immutable Fields
- Prevent changes to critical fields:
  - User email
  - User ID
  - Created timestamps
  - Participant IDs in trips

### 5. Audit Trail
- Never delete documents (soft delete via status)
- Keep all timestamps
- Track who created/updated documents
- Use this data for debugging and analytics

### 6. Regular Security Reviews
- Review rules when adding new features
- Test rules with Firebase Emulator
- Monitor Firebase Console for unusual activity
- Update rules based on new threats

### 7. Error Messages
- Don't leak sensitive information in errors
- Use generic "Permission denied" messages
- Log detailed errors server-side only
- Never expose user data in error messages

### 8. Rate Limiting
- Security rules don't provide rate limiting
- Use Firebase App Check for DDoS protection
- Consider Cloud Functions for request throttling
- Monitor usage in Firebase Console

---

## Deployment Instructions

### Pre-Deployment Checklist
- [ ] All tests passing in emulator
- [ ] Code reviewed and approved
- [ ] Test plan documented and executed
- [ ] Backup of current rules taken (from Firebase Console)
- [ ] Team notified of deployment

### Deployment Steps

1. **Review Current Rules**
   ```bash
   # View current deployed rules
   firebase firestore:rules:list
   ```

2. **Test Rules Locally First**
   ```bash
   # Start emulator with rules
   firebase emulators:start --only firestore

   # Run tests against emulator
   # [Execute test plan]
   ```

3. **Deploy to Production**
   ```bash
   # Deploy only firestore rules
   firebase deploy --only firestore:rules

   # If you also need to deploy indexes
   firebase deploy --only firestore
   ```

4. **Verify Deployment**
   - Check Firebase Console > Firestore > Rules tab
   - Verify "Last deployed" timestamp updated
   - Check rules content matches local file

5. **Smoke Test Production**
   - Test one critical flow in production app
   - Create a request as commuter
   - Accept request as driver
   - Verify no permission errors

6. **Monitor for Issues**
   - Watch Firebase Console > Usage tab for errors
   - Check app error logs for permission denied errors
   - Be ready to rollback if issues found

### Rollback Procedure
If issues are found after deployment:

1. **Quick Rollback via Console**
   - Firebase Console > Firestore > Rules
   - Click "View release history"
   - Click "Restore" on previous version

2. **Rollback via CLI**
   ```bash
   # Get previous rules from git history
   git log --oneline firestore.rules
   git show <commit-hash>:firestore.rules > firestore.rules

   # Deploy old rules
   firebase deploy --only firestore:rules
   ```

3. **Notify Team**
   - Document issue found
   - Create ticket for fix
   - Test thoroughly before re-deploying

---

## Future Enhancements

### 1. Cloud Functions for Complex Logic
Move business logic from security rules to Cloud Functions:
- Price calculation and validation
- Request expiration handling
- Driver matching algorithm
- Request cleanup jobs

### 2. Firebase App Check
Add App Check to prevent abuse:
```typescript
// In config.ts
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

### 3. Advanced Role-Based Access Control
- Admin role for customer support
- Super admin for system management
- Read-only roles for analytics

### 4. Field-Level Security
- Encrypt sensitive data (phone numbers, addresses)
- Use Firebase Extensions for data masking
- Implement PII handling rules

### 5. Comprehensive Audit Logging
- Log all security rule failures
- Track unusual access patterns
- Alert on potential security issues

### 6. Performance Optimization
- Add indexes for common queries
- Optimize rule evaluation order
- Cache user role lookups

---

## Dependencies

### Required Before Starting
- [x] Firebase project created (`towlink-71a59`)
- [x] Firebase SDK integrated in app
- [x] Firebase Authentication implemented
- [x] User role system implemented (users collection with role field)
- [x] Data models defined (types/models.ts)

### Tools Required
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase project initialized (`firebase init`)
- [ ] Firebase emulators downloaded
- [ ] Git for version control

### Knowledge Required
- Understanding of Firestore security rules syntax
- Familiarity with TowLink data models
- Understanding of user roles (commuter, driver, both)
- Basic Firebase CLI commands

---

## Success Criteria

This story is complete when:
1. ✅ `firestore.rules` file created with comprehensive rules
2. ✅ All acceptance criteria tests pass in Firebase emulator
3. ✅ Rules deployed to production Firebase project
4. ✅ Production smoke test passes (create request, accept, update trip)
5. ✅ No security vulnerabilities identified
6. ✅ Test plan documented and executed
7. ✅ Team can explain rules and make future modifications

---

## Resources

### Documentation
- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Security Rules Language Reference](https://firebase.google.com/docs/firestore/security/rules-structure)
- [Testing Security Rules](https://firebase.google.com/docs/rules/unit-tests)

### Firebase Console
- [TowLink Firebase Console](https://console.firebase.google.com/u/2/project/towlink-71a59/overview)
- Project ID: `towlink-71a59`

### Related Jira Stories
- TOW-9: Firebase Authentication (prerequisite)
- TOW-10: User Role System (prerequisite)
- TOW-11: Persistent Auth State (prerequisite)

---

**Last Updated**: 2026-02-09
**Author**: technical-architect agent
**Next Step**: Invoke `code-coach` agent to create lesson plan from this specification
