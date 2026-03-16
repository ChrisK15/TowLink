# Coding Conventions

**Analysis Date:** 2026-03-13

## Naming Patterns

**Files:**
- React Native screens: PascalCase with descriptive names (e.g., `FindingDriverModal.tsx`, `RequestServiceSheet.tsx`)
- Services and utilities: camelCase with functional names (e.g., `firestore.ts`, `geoLocationUtils.ts`, `requestCalculations.ts`)
- Hooks: kebab-case with `use-` prefix (e.g., `use-watch-request.ts`, `use-claimed-request.ts`, `use-active-trip.ts`)
- Type definition files: singular, descriptive (e.g., `models.ts`)

**Functions:**
- Async service functions: descriptive verb-noun pattern (e.g., `createRequest()`, `updateDriverAvailability()`, `acceptClaimedRequest()`)
- Event handlers: `handle` prefix (e.g., `handleDetectLocation()`, `handleSubmit()`, `handleDropoffEndEditing()`)
- Query/fetch functions: `get`/`fetch` prefix (e.g., `getTripByRequestId()`, `getRequestById()`)
- Listeners: `listen` prefix (e.g., `listenForRequests()`, `listenToTrip()`)
- Boolean checks: `is`/`use` prefix (e.g., `isFormValid`, `isDetectingLocation`, `useAuth()`)

**Variables:**
- State with useState: consistently named with value and setter (e.g., `const [userLocation, setUserLocation]`, `const [activeRequestId, setActiveRequestId]`)
- Coordinates: `Coords` suffix (e.g., `pickupCoords`, `dropoffCoords`, `finalPickupCoords`)
- Temporary/computed values: descriptive noun (e.g., `resolvedPickupCoords`, `miles`, `price`)
- UI state: prefix indicating purpose (e.g., `isDetectingLocation`, `isCalculatingPrice`, `isSubmitting`)

**Types:**
- Interfaces: PascalCase (e.g., `User`, `Driver`, `Request`, `Trip`, `VehicleInfo`)
- Type unions: PascalCase with full name (e.g., `ServiceType`, `RequestStatus`)
- Component props: ComponentName + `Props` suffix (e.g., `RequestServiceSheetProps`, `FindingDriverModalProps`)

## Code Style

**Formatting:**
- Tabs for indentation (configured in `package.json` prettier: `"useTabs": true`)
- 2-space tab width
- Single quotes for strings
- Line length: no strict limit enforced, but components stay readable (~80 lines average for modals/sheets)

**Linting:**
- Tool: ESLint with `expo` config (`eslint-config-expo`)
- Command: `npm run lint`
- Configuration: Uses Expo's preset (no custom `.eslintrc` file in repository)

**Strict TypeScript:**
- `tsconfig.json` has `"strict": true`
- All functions have explicit return types
- All component props are typed via interfaces
- `any` type avoided; `error: any` acceptable only in catch blocks for Firebase errors

## Import Organization

**Order:**
1. External packages (React, React Native, Firebase)
2. Relative imports from `@/` path alias (services, types, components, hooks, constants)
3. Organized by functionality (imports from same module grouped)

**Examples from codebase:**
```typescript
// RequestServiceSheet.tsx
import { useAuth } from '@/context/auth-context';
import { createRequest } from '@/services/firebase/firestore';
import { geocodeAddress, reverseGeocode } from '@/services/geoLocationUtils';
import { calculateDistanceMiles, calculateFare } from '@/services/requestCalculations';
import { ServiceType } from '@/types/models';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert, Dimensions, FlatList, ... } from 'react-native';
```

**Path Aliases:**
- `@/*` resolves to project root
- Used consistently for all internal imports across `services/`, `components/`, `types/`, `hooks/`, `context/`

## Error Handling

**Patterns:**
- Try-catch-finally structure used universally for async operations
- Firebase-specific error handling with error code mapping in `services/firebase/authService.ts`
- User-friendly error messages displayed via `Alert.alert()`
- Console.error() for logging before user alert
- Cast to `error: any` when catching Firebase errors due to SDK typing

**Examples:**
```typescript
// In authService.ts
if (error.code === 'auth/invalid-email') {
  throw new Error('Invalid email format.');
}
if (error.code === 'auth/email-already-in-use') {
  throw new Error('This email is already registered...');
}

// In components
try {
  const result = await someService();
} catch (error) {
  console.error('Error context:', error);
  Alert.alert('Error', 'User-friendly message');
} finally {
  setLoading(false);
}
```

## Logging

**Framework:** `console` (no external logger)

**Patterns:**
- `console.error()` for errors with context (e.g., `console.error('Error fetching user role', error)`)
- `console.log()` for operation success (e.g., `console.log('trip created: ', tripRef.id)`)
- No debug logging in production code
- Errors logged before throwing or displaying to user

## Comments

**When to Comment:**
- Explain WHY, not WHAT (code should be self-documenting)
- Complex logic requiring context (e.g., retry logic in `FindingDriverModal.tsx`: `// Brief Firestore lag — retry once after 1 second`)
- Inline comments for TODO items (e.g., `{/* TODO Sprint 4: Replace with live ETA from driver location */}`)
- Business rule explanations (e.g., GPS coordinate validation, timestamp handling)

**JSDoc/TSDoc:**
- Not used consistently in current codebase
- When needed, use for public service functions and type definitions

## Function Design

**Size:**
- Most functions 20-50 lines
- Handlers broken into logical steps (detect location → validate → submit)
- Long components extract sub-handlers (e.g., `handleDetectLocation()`, `handleClose()`, `handleSubmit()` in RequestServiceSheet)

**Parameters:**
- Explicit typing required
- Multiple related parameters grouped into objects (e.g., `profile: { name: string; phone: string }` in `updateUserProfile()`)
- Optional parameters placed last with `?` syntax
- No rest parameters (`...args`) in current codebase

**Return Values:**
- Explicit return types on all functions
- Async functions return `Promise<Type>`
- Void functions explicit: `: Promise<void>`
- String returns for IDs: `Promise<string>` (e.g., `createRequest()` returns request ID)
- Null-safe returns: `Promise<Type | null>` (e.g., `getTripByRequestId()`)

## Module Design

**Exports:**
- Named exports consistently used
- Single `export default function` for screen components
- Multiple exports from service/utility files
- Example from `firestore.ts`: multiple `export async function` declarations

**Barrel Files:**
- Not used in current codebase
- Imports go directly to source files (e.g., `from '@/services/firebase/firestore'` not from `@/services`)

---

*Convention analysis: 2026-03-13*
