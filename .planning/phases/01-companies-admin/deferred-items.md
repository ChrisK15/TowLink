# Deferred Items

Pre-existing lint errors found during 01-06 execution. Out of scope (not caused by current task).

## react/no-unescaped-entities errors

These exist in pre-existing files and are not related to the drivers.tsx changes in plan 01-06.

- `app/(auth)/onboarding/commuter-login.tsx:181` — unescaped `'`
- `app/(driver)/index.tsx:340` — unescaped `'`
- `components/FindingDriverModal.tsx:140` — unescaped `'`

Fix in a future cleanup pass.
