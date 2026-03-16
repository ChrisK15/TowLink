# Phase 1: Companies & Admin - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Tow yard admins can register their company and manage their driver roster; drivers authenticate via company email and are automatically linked to their tow yard. This phase establishes the `companies` Firestore collection, the `admin` role, and the admin dashboard screen. Dispatch routing (Phase 2), driver maps (Phase 3), and notifications (Phase 4) are out of scope here.

</domain>

<decisions>
## Implementation Decisions

### Admin Registration
- Admin accounts are created manually via Firestore seed (developer sets role='admin' and companyId directly in Firebase console) — no in-app admin signup screen needed
- Role detection: add `'admin'` to the `role` field on the existing `users/{uid}` Firestore doc (consistent with current commuter/driver pattern)
- Admin's `users/{uid}` doc gets a `companyId` field linking them to their company document
- `AuthContext` reads role and routes `'admin'` users to a new `app/(admin)` route group

### Driver Invitation (COMP-02)
- Mechanism: pre-authorize emails — admin adds a driver email to `companies/{id}.authorizedEmails[]` array
- Linkage timing: at driver signup — `signUpWithEmail` checks all companies' `authorizedEmails` for the new email; if found, sets `role='driver'` and `companyId` on the user doc immediately
- If email is NOT in any company's authorized list → block signup with error: "This email isn't registered with a tow yard. Contact your company admin."
- No invite email or separate invitations collection needed

### Service Area (COMP-01)
- Stored as `serviceRadiusKm: number` on the company doc (e.g., 25 for 25 km)
- Company location stored as `location: { latitude, longitude }` — auto-geocoded from the admin's entered address using the existing Google Maps API integration (no manual coordinate entry)
- This `location` + `serviceRadiusKm` combo is what Phase 2 will use for nearest-company routing queries

### Driver Deactivation (COMP-03)
- Admin deactivates a driver via swipe-to-deactivate on the Drivers tab row (swipe left reveals red "Deactivate" button)
- Deactivation sets `isActive: false` on the driver's record (or removes them from the active roster)

### Admin Dashboard Layout (COMP-04, COMP-05)
- Structure: tabbed screen — **Jobs** tab | **Drivers** tab
- **Jobs tab**: real-time list of active requests/trips; each row shows: status badge + commuter name + service type + assigned driver name
- **Drivers tab**: roster of all company drivers with online/offline badge; swipe-left to deactivate
- Real-time updates via Firestore listeners (same pattern as existing `listenForRequests()` hooks)

### Claude's Discretion
- Exact visual styling of admin screens (colors, spacing, badge styles) — follow existing `constants/theme.ts`
- Whether deactivated drivers are hidden from the Drivers tab or shown with a "Deactivated" state
- Exact Firestore query used to look up authorized emails at signup (cross-collection query or subcollection)
- Geohash storage on company location (useful for Phase 2 — Claude can decide based on Phase 2 requirements)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — COMP-01 through COMP-05 and AUTH-01 define all acceptance criteria for this phase
- `.planning/ROADMAP.md` §Phase 1 — Success criteria (5 items) that must all be true for phase completion

### No external specs
No ADRs, design docs, or external specs exist yet for this project. Requirements are fully captured in decisions above and in REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `context/auth-context.tsx` — existing AuthContext; add `'admin'` to role type and route to `app/(admin)` on auth state change
- `services/firebase/authService.ts` — `signUpWithEmail()` needs company email check before account creation; `updateUserRole()` type needs `'admin'` added
- `services/firebase/firestore.ts` — all new company CRUD + driver roster listener functions go here (existing pattern)
- `types/models.ts` — add `Company` interface and extend `User.role` to include `'admin'`; add `companyId?: string` to User
- `@gorhom/bottom-sheet` — available if admin needs bottom sheet modals (e.g., add driver form)
- `services/geoLocationUtils.ts` — `geocodeAddress()` already exists for converting address → lat/lng (check exact export name)

### Established Patterns
- Custom hooks wrap Firestore listeners (e.g., `hooks/use-active-trip.ts`) — create `hooks/use-company-jobs.ts` and `hooks/use-company-drivers.ts` following same pattern
- All Firestore ops go through `services/firebase/firestore.ts` — admin screens must not call Firebase SDK directly
- Role-based routing: `app/_layout.tsx` reads `role` from AuthContext and redirects → extend to handle `'admin'` → `/(admin)`
- Error handling: try-catch with `Alert.alert()` for user-facing errors (consistent throughout app)
- Tab navigation: `app/(commuter)/_layout.tsx` uses Expo Router tabs — replicate pattern for `app/(admin)/_layout.tsx`

### Integration Points
- `app/_layout.tsx` — add `'admin'` to the role switch that determines which route group to enter
- `app/(auth)/` — driver signup flow needs to check authorized emails before creating account
- New route group: `app/(admin)/` with `_layout.tsx` (tabs: index=Jobs, drivers=Drivers)
- New Firestore collection: `companies/{companyId}` with fields: `name`, `address`, `location`, `serviceRadiusKm`, `authorizedEmails[]`, `ownerUid`, `createdAt`

</code_context>

<specifics>
## Specific Ideas

No specific references or "I want it like X" moments — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-companies-admin*
*Context gathered: 2026-03-15*
