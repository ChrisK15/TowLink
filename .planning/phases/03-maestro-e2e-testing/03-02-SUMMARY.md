---
phase: 03-maestro-e2e-testing
plan: 02
subsystem: testing
tags: [testid, maestro-dropped, onboarding]

# Dependency graph
requires:
  - phase: 03-maestro-e2e-testing
    plan: 01
    provides: Firebase emulators, seed script, expo-dev-client, bundleIdentifier
provides:
  - testID props on interactive elements across 8+ screens/components
  - testID props on onboarding and role selection buttons
affects: []

# Tech tracking
tech-stack:
  added: []
  removed:
    - Maestro YAML test flows (.maestro/ directory)
    - scripts/run-e2e.sh
    - test:e2e, test:e2e:setup, test:e2e:run npm scripts
  patterns:
    - testID on interactive elements for future testing use

key-files:
  created: []
  modified:
    - app/(auth)/login.tsx
    - app/(auth)/signup.tsx
    - app/(auth)/onboarding/index.tsx
    - app/(auth)/onboarding/commuter-login.tsx
    - app/(commuter)/index.tsx
    - app/(driver)/index.tsx
    - components/RequestServiceSheet.tsx
    - components/FindingDriverModal.tsx
    - components/ActiveTripSheet.tsx
    - components/RequestPopup.tsx
    - components/onboarding/RoleCard.tsx
    - package.json
  deleted:
    - .maestro/ (entire directory)
    - scripts/run-e2e.sh

key-decisions:
  - "Maestro E2E dropped — Expo dev client launcher, onboarding flow, and dev menu overlay made automated flows too brittle and required excessive micro-management of UI state"
  - "testID props retained on components — zero-cost and useful for any future testing framework"
  - "Firebase emulator infrastructure (Plan 01) fully retained as useful for local development"

requirements-completed: []

# Metrics
duration: ~45min (including Maestro iteration and removal)
completed: 2026-03-21
---

# Phase 3 Plan 02: testID Props + Maestro (Dropped) Summary

**testID props added to interactive elements across screens and onboarding. Maestro YAML flows were created, iterated on, and ultimately removed — Expo dev client's launcher/onboarding/dev menu screens made automated E2E flows too brittle.**

## What Happened

1. Added testID props to 22+ interactive elements across 8 screens/components
2. Created 5 Maestro test flows + 3 login subflows + runner script
3. Iterated through multiple fixes: Maestro `timeout` syntax, Expo dev client launcher, onboarding button text, keyboard dismissal
4. After repeated failures due to Expo dev client friction (launcher screen, "Continue" button, dev menu overlay, onboarding flow), decided to drop Maestro entirely
5. Removed all .maestro/ files and Maestro-related npm scripts
6. Retained testID props and Firebase emulator infrastructure

## What's Kept

- **testID props** on login, signup, commuter, driver, admin, and component screens
- **testID props** on onboarding Next button and role selection cards
- **Firebase emulator infrastructure** (Plan 01) — fully functional

## What's Removed

- `.maestro/` directory (all 8 YAML flow files)
- `scripts/run-e2e.sh`
- `test:e2e`, `test:e2e:setup`, `test:e2e:run` npm scripts

## Why Maestro Was Dropped

Expo dev client adds multiple screens before the actual app:
1. Dev server selector (`http://localhost:8081`)
2. "Continue" button
3. Dev menu overlay (dismissible by tapping outside)
4. 3-screen onboarding flow
5. Role selection

Each screen required fragile text/coordinate matching. The `hideKeyboard` command also failed on custom inputs. The cumulative friction made automated E2E testing impractical for this project's dev setup.

---
*Phase: 03-maestro-e2e-testing*
*Completed: 2026-03-21*
