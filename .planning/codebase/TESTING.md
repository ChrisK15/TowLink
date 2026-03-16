# Testing Patterns

**Analysis Date:** 2026-03-13

## Test Framework

**Runner:**
- No test framework currently configured
- Project has no `jest.config.js`, `vitest.config.js`, or test npm scripts
- ESLint available: `npm run lint` (code quality only, not testing)

**Assertion Library:**
- Not installed

**Run Commands:**
```bash
npm run lint              # Code quality check (ESLint only)
```

## Test File Organization

**Current State:**
- No test files in project (`/tests`, `/__tests__`, or `.test.ts`/`.spec.ts` files)
- Project is in early development phase (Phase 2: Maps & Core UI)
- No test data or fixtures directory

**Recommended Structure (when implementing):**
```
services/
  firebase/
    firestore.ts
    firestore.test.ts          # Unit tests for Firestore operations

components/
  RequestServiceSheet.tsx
  RequestServiceSheet.test.tsx # Component tests

hooks/
  use-watch-request.ts
  use-watch-request.test.ts    # Hook tests
```

**Naming Convention:**
- Test files: `[source-file].test.ts` or `[source-file].spec.ts`
- Co-located with source files (not in separate test directory)

## Test Structure

**Recommended Framework:**
Based on React Native + Expo stack, recommend either:
- **Jest** (native support in Expo, works with React Native)
- **Vitest** (faster, modern, requires config)

**Example Structure for Future Implementation:**
```typescript
import { createRequest } from '@/services/firebase/firestore';
import { Request } from '@/types/models';

describe('createRequest', () => {
  // Setup/teardown
  beforeEach(() => {
    // Mock Firebase
  });

  afterEach(() => {
    // Cleanup
  });

  it('creates request with valid coordinates', async () => {
    // Arrange
    const commuterId = 'test-user-123';
    const pickupLocation = { latitude: 34.0522, longitude: -118.2437 };

    // Act
    const requestId = await createRequest(
      commuterId,
      pickupLocation,
      // ... other params
    );

    // Assert
    expect(requestId).toBeTruthy();
    expect(typeof requestId).toBe('string');
  });

  it('throws on invalid latitude', async () => {
    // Arrange
    const invalidLocation = { latitude: 95, longitude: -118.2437 };

    // Act & Assert
    await expect(
      createRequest('user', invalidLocation, /* ... */)
    ).rejects.toThrow('Invalid pickup latitude range.');
  });
});
```

**Patterns:**
- Setup: `beforeEach()` for common initialization
- Teardown: `afterEach()` for cleanup (unsubscribe from listeners, reset mocks)
- Assertion style: `expect()` chains from Jest/Vitest
- Async tests: `async/await` with `rejects.toThrow()` for error cases

## Mocking

**Framework Options:**
- Jest: Built-in `jest.mock()` and `jest.spyOn()`
- Vitest: Similar API to Jest, also has `vi.mock()`, `vi.spyOn()`

**Patterns to Mock (High Priority):**

1. **Firebase Services** (critical for isolation)
```typescript
jest.mock('@/services/firebase/firestore', () => ({
  createRequest: jest.fn().mockResolvedValue('mock-request-id'),
  listenToRequest: jest.fn((id, callback) => {
    callback({ id, status: 'searching' });
    return () => {}; // unsubscribe
  }),
}));
```

2. **Geolocation Services**
```typescript
jest.mock('@/services/geoLocationUtils', () => ({
  geocodeAddress: jest.fn().mockResolvedValue({
    latitude: 34.0522,
    longitude: -118.2437
  }),
  reverseGeocode: jest.fn().mockResolvedValue('123 Main St'),
}));
```

3. **Expo APIs** (Location, Alert)
```typescript
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({
    status: 'granted'
  }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 34.0522, longitude: -118.2437 }
  }),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: { alert: jest.fn() },
}));
```

**What to Mock:**
- Firebase Firestore operations (speeds up tests, allows offline testing)
- Geolocation services (external API, slow, requires permissions)
- React Native Alert (prevents modal popups during tests)
- Expo Location API (requires device permissions)

**What NOT to Mock:**
- Type definitions (interfaces, types)
- Pure utility functions (calculations)
- React hooks behavior (use actual React hooks when possible)
- Internal component state (test through props/output)

## Fixtures and Factories

**Test Data Patterns (when implementing):**

`services/mockData/request.ts` (already exists in codebase):
```typescript
// Reuse existing mock data structure
export const mockRequest = {
  id: 'req-123',
  commuterId: 'user-123',
  location: { latitude: 34.0522, longitude: -118.2437 },
  dropoffLocation: { latitude: 34.0625, longitude: -118.2410 },
  serviceType: 'tow' as ServiceType,
  status: 'searching' as const,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
};
```

**Factory Pattern (Recommended):**
```typescript
// services/mockData/factories.ts (to be created)
import { User, Driver, Request, Trip } from '@/types/models';

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'commuter',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockRequest(overrides?: Partial<Request>): Request {
  return {
    id: 'req-123',
    commuterId: 'user-123',
    location: { latitude: 34.0522, longitude: -118.2437 },
    dropoffLocation: { latitude: 34.0625, longitude: -118.2410 },
    pickupAddress: '123 Main St',
    dropoffAddress: '456 Oak Ave',
    serviceType: 'tow',
    status: 'searching',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    ...overrides,
  };
}
```

**Location:**
- Create `services/mockData/` directory for factories
- Or use `.jest/fixtures/` for shared test data

## Coverage

**Requirements:**
- Not currently enforced
- No Jest/Vitest coverage configuration

**Recommendation When Implementing:**
```bash
# View coverage (when configured)
npm run test:coverage

# Jest config option
{
  "jest": {
    "collectCoverageFrom": [
      "services/**/*.ts",
      "hooks/**/*.ts",
      "!**/*.test.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## Test Types

**Unit Tests (Priority: High)**

Focus area: `services/firebase/firestore.ts`
- Test: Each service function independently with mocked Firebase
- Example: `createRequest()` validates coordinates before submission
- Validates: Coordinate range checks, timestamp handling, ID returns

```typescript
it('validates pickup latitude is between -90 and 90', async () => {
  await expect(
    createRequest('user', { latitude: 95, longitude: 0 }, /* ... */)
  ).rejects.toThrow('Invalid pickup latitude range.');
});
```

Focus area: `services/requestCalculations.ts`
- Test: Pure calculation functions
- Example: `calculateFare()` returns correct price
- Validates: Math, edge cases (0 miles, extreme distances)

Focus area: `hooks/use-*.ts`
- Test: Hook behavior with mocked services
- Example: `useWatchRequest()` subscribes/unsubscribes properly
- Validates: Cleanup functions called, state updates

**Integration Tests (Priority: Medium)**

Focus area: `context/auth-context.tsx`
- Test: Auth provider with mocked Firebase auth/Firestore
- Validates: User login flow, role fetching, provider wrapping

Focus area: Component + Service interactions
- Test: `RequestServiceSheet` creating a request
- Validates: Form validation → service call → callback trigger
- Requires: Firebase mocking, geolocation mocking

**E2E Tests (Priority: Low)**

Currently: Not used

Recommendation when needed:
- Tool: Detox (React Native E2E framework)
- Scope: Core user flows (commuter requesting assistance, driver accepting)
- Runs on: Real device or simulator

## Common Patterns

**Async Testing:**
```typescript
// Test async function with success
it('fetches and returns user', async () => {
  jest.spyOn(firestore, 'getRequestById').mockResolvedValue(mockRequest);

  const result = await getRequestById('req-123');

  expect(result).toEqual(mockRequest);
});

// Test async with error
it('throws on Firestore error', async () => {
  jest.spyOn(firestore, 'getRequestById')
    .mockRejectedValue(new Error('Permission denied'));

  await expect(getRequestById('req-123')).rejects.toThrow('Permission denied');
});
```

**Error Testing:**
```typescript
it('throws descriptive error for invalid location', async () => {
  await expect(
    createRequest('user', { latitude: 0, longitude: 0 }, /* ... */)
  ).rejects.toThrow('Invalid pickup location.');
});

// Firebase error mapping
it('handles auth/invalid-email error', async () => {
  jest.spyOn(firebase, 'signInWithEmail')
    .mockRejectedValue({ code: 'auth/invalid-email' });

  await expect(signInWithEmail('bad', 'pass'))
    .rejects.toThrow('Invalid email format.');
});
```

**Mocking Firebase Listeners:**
```typescript
it('calls callback when request status changes', () => {
  const callback = jest.fn();

  jest.spyOn(firestore, 'listenToRequest')
    .mockImplementation((id, cb) => {
      cb({ id, status: 'accepted' });
      return () => {}; // unsubscribe
    });

  const unsubscribe = listenToRequest('req-123', callback);

  expect(callback).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'accepted' })
  );

  unsubscribe();
});
```

---

*Testing analysis: 2026-03-13*
