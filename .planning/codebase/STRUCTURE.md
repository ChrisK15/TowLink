# STRUCTURE.md — Directory Layout & Organization

**Project:** TowLink
**Focus:** directory layout, key locations, naming conventions
**Generated:** 2026-03-13

---

## Top-Level Layout

```
towlink/
├── app/                    # Expo Router screens (file-based routing)
├── components/             # Reusable UI components
├── constants/              # Theme, colors, config values
├── context/                # React context providers
├── contexts/               # (empty — duplicate of context/, consolidate)
├── hooks/                  # Custom React hooks
├── services/               # Business logic & external service integrations
├── types/                  # TypeScript interfaces and type definitions
├── assets/                 # Images, icons, splash screen
├── functions/              # Firebase Cloud Functions (Node.js)
├── scripts/                # Utility scripts
├── .claude/                # Claude Code agent system (not app code)
├── .planning/              # GSD planning documents (not app code)
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore composite indexes
├── firebase.json           # Firebase project config
├── app.config.js           # Expo app configuration
├── babel.config.js         # Babel/transpiler config
├── tsconfig.json           # TypeScript config (root)
├── eslint.config.js        # ESLint flat config
└── package.json            # App dependencies
```

---

## `app/` — Screens (Expo Router)

File-based routing. Directory name = URL segment. Parenthetical groups `(name)` are layout groups (don't affect URL).

```
app/
├── _layout.tsx                     # Root layout — wraps entire app, sets up auth guard
├── modal.tsx                       # Global modal screen
│
├── (auth)/                         # Auth flow (unauthenticated users)
│   ├── _layout.tsx                 # Auth layout (stack navigator)
│   ├── index.tsx                   # Auth entry/redirect
│   ├── login.tsx                   # Login screen
│   ├── signup.tsx                  # Registration screen
│   ├── role-selection.tsx          # Choose commuter or driver role
│   ├── commuter-setup.tsx          # Commuter profile setup
│   └── onboarding/                 # Onboarding slides
│       ├── _layout.tsx
│       ├── index.tsx               # Onboarding entry
│       ├── commuter-login.tsx      # Commuter login via onboarding
│       └── role-selection.tsx      # Role selection via onboarding
│
├── (commuter)/                     # Commuter-role screens (authenticated)
│   ├── _layout.tsx                 # Commuter tab/stack layout
│   └── index.tsx                   # Main commuter map & request screen
│
└── (driver)/                       # Driver-role screens (authenticated)
    ├── _layout.tsx                 # Driver tab/stack layout
    └── index.tsx                   # Main driver dashboard & map screen
```

**Key entry point:** `app/_layout.tsx` — auth state determines routing to `(auth)` or role-based groups.

---

## `components/` — UI Components

```
components/
├── ActiveTripSheet.tsx             # Bottom sheet: active trip status for driver
├── CommuterTripSheet.tsx           # Bottom sheet: trip status for commuter
├── FindingDriverModal.tsx          # Overlay: searching for driver animation
├── RequestPopup.tsx                # Popup: new request notification for driver
├── RequestServiceSheet.tsx         # Bottom sheet: commuter service request form
│
├── onboarding/                     # Onboarding-specific components
│   ├── OnboardingHeader.tsx
│   ├── OnboardingSlide.tsx
│   ├── PaginationDots.tsx
│   └── RoleCard.tsx
│
└── ui/                             # Generic Expo-provided UI primitives
    ├── collapsible.tsx
    ├── icon-symbol.tsx             # Cross-platform icon component
    ├── icon-symbol.ios.tsx         # iOS-specific icon override
    ├── external-link.tsx
    ├── haptic-tab.tsx
    ├── hello-wave.tsx
    ├── parallax-scroll-view.tsx
    ├── themed-text.tsx
    └── themed-view.tsx
```

**Pattern:** Feature-specific sheets/modals live at `components/` root. Generic primitives live in `components/ui/`.

---

## `hooks/` — Custom React Hooks

```
hooks/
├── use-active-trip.ts              # Driver: real-time active trip listener
├── use-claimed-request.ts          # Driver: watch claimed request state
├── use-commuter-trip.ts            # Commuter: real-time trip status
├── use-watch-request.ts            # Watch a specific tow request
├── use-color-scheme.ts             # Theme: system color scheme detection
├── use-color-scheme.web.ts         # Theme: web-specific color scheme override
└── use-theme-color.ts              # Theme: resolve color by scheme
```

**Pattern:** `use-kebab-case.ts` naming. Domain hooks (trip, request) wrap Firestore listeners. Theme hooks are Expo defaults.

---

## `services/` — Business Logic

```
services/
├── firebase/
│   ├── config.ts                   # Firebase app initialization & exports
│   ├── firestore.ts                # All Firestore CRUD + real-time operations
│   ├── authService.ts              # Auth: sign in, sign up, sign out
│   └── test.ts                     # Manual Firebase test utilities (dev only)
│
├── geoLocationUtils.ts             # Geohash helpers, distance calc (geofire-common)
├── requestCalculations.ts          # Pricing: base fee + per-km rate calculation
│
├── location/                       # (empty — planned location service)
├── maps/                           # (empty — planned maps service)
└── mockData/
    └── request.ts                  # Mock tow request data for development
```

**Pattern:** All Firestore operations go through `services/firebase/firestore.ts`. Screens don't call Firebase SDK directly.

---

## `context/` — React Context

```
context/
├── auth-context.tsx                # AuthContext: current user, loading state, role

contexts/                           # ⚠️ Empty duplicate directory — should be removed
```

**Note:** `context/` and `contexts/` both exist. Only `context/auth-context.tsx` has content. The `contexts/` directory is empty and should be deleted.

---

## `types/` — TypeScript Types

```
types/
├── models.ts                       # Core data models: TowRequest, Trip, User, Driver
└── onboarding.ts                   # Onboarding flow types
```

**Pattern:** Shared types live in `types/`. Component-local types stay inline.

---

## `constants/` — Config & Theme

```
constants/
└── theme.ts                        # Colors, spacing, typography constants
```

---

## `functions/` — Firebase Cloud Functions

```
functions/
├── src/
│   └── index.ts                    # All Cloud Functions definitions
├── lib/                            # Compiled output (generated, don't edit)
│   ├── index.js
│   └── index.js.map
├── package.json                    # Functions dependencies (separate from app)
├── tsconfig.json
└── tsconfig.dev.json
```

**Note:** Functions have their own `node_modules` and `package.json` — separate install required (`cd functions && npm install`).

---

## `.claude/` — Agent System (Not App Code)

```
.claude/
├── context/
│   ├── current-story.md            # Active Jira story context
│   └── sprint-status.md            # Current sprint summary
├── specs/                          # Technical specs per story (TOW-N.md)
├── progress/                       # Implementation progress per story
├── reviews/                        # Code review results per story
├── docs/                           # Reference docs (ARCHITECTURE, PATTERNS, etc.)
├── design/screens/                 # UI design screenshots
└── settings.local.json             # Claude Code local settings
```

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Screen files | `kebab-case.tsx` | `role-selection.tsx` |
| Component files | `PascalCase.tsx` | `RequestServiceSheet.tsx` |
| Hook files | `use-kebab-case.ts` | `use-active-trip.ts` |
| Service files | `camelCase.ts` | `authService.ts`, `firestore.ts` |
| Type files | `kebab-case.ts` | `models.ts` |
| Constants | `kebab-case.ts` | `theme.ts` |
| Context | `kebab-case.tsx` | `auth-context.tsx` |

**Note:** Naming is inconsistent — some components use PascalCase, some use kebab-case. Hooks consistently use `use-kebab-case`. Standardize toward PascalCase for components.

---

## Where to Add New Code

| What | Where |
|------|-------|
| New screen | `app/(commuter)/` or `app/(driver)/` depending on role |
| New shared component | `components/` |
| New onboarding component | `components/onboarding/` |
| New custom hook | `hooks/use-[name].ts` |
| New Firestore operation | `services/firebase/firestore.ts` |
| New auth operation | `services/firebase/authService.ts` |
| New data type | `types/models.ts` |
| New constant/theme value | `constants/theme.ts` |
| New Cloud Function | `functions/src/index.ts` |
| New pricing/calc logic | `services/requestCalculations.ts` |
| New geo utility | `services/geoLocationUtils.ts` |

---

## Path Aliases (tsconfig)

```typescript
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { TowRequest } from '@/types/models';
import { createTowRequest } from '@/services/firebase/firestore';
```

`@/` maps to the project root (configured in `tsconfig.json`).
