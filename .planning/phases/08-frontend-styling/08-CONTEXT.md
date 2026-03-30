# Phase 8: Frontend Styling & Global App Style - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish a cohesive visual design system with consistent typography, colors, spacing, and component styling across all screens. This phase delivers the design token foundation (via Unistyles), shared UI components (Button, Card, Input, Badge, Header), and a full restyle of every screen in the app — auth, commuter, driver, and admin — with branded auth/onboarding screens and refreshed map overlays. Both light and dark mode supported.

</domain>

<decisions>
## Implementation Decisions

### Brand Identity & Color Palette
- **D-01:** Color palette derived from the TowLink logo (navy-to-medium blue shield with tow hook). Primary: navy blue, accent: medium/bright blue from logo gradients
- **D-02:** Professional & clean visual tone — trustworthy, not flashy. Navy primary, white/light backgrounds, subtle blue accents
- **D-03:** Full light AND dark mode support. Both themes must be implemented and functional
- **D-04:** Status colors use universal standards: green (success), amber/orange (warning), red (error), blue (info) — not brand-tinted

### Typography & Spacing
- **D-05:** Custom font: Inter. Requires expo-font setup, adds ~100KB to bundle. Distinctive branded look over system defaults
- **D-06:** Compact typography scale with 5 sizes: caption (12), body (14), subtitle (16), title (20), heading (24)
- **D-07:** Claude's Discretion on spacing scale — choose between 4px or 8px base grid based on the app's density needs (map overlays, sheets, forms, admin tables)

### Component Styling Approach
- **D-08:** Use react-native-unistyles as the styling framework. Provides Tailwind-like utility styling with built-in dark mode and responsive breakpoints. Replaces ad-hoc StyleSheet.create patterns
- **D-09:** Create a shared Button component with variants: primary (filled blue), secondary (outlined), destructive (red), ghost (text-only). All screens use it
- **D-10:** Create shared Card component (surface container with consistent shadow, border-radius, padding) for trip sheets, admin dashboard, completion screen
- **D-11:** Create shared Input/TextInput component with label, error state, focus ring for auth forms, request form, admin forms
- **D-12:** Create shared Badge/Status chip for trip status indicators (searching, en_route, completed, etc.) across commuter, driver, and admin screens
- **D-13:** Create shared Header/AppBar component for consistent screen headers across all route groups

### Screen-by-Screen Polish
- **D-14:** Full restyle of ALL screens — every screen gets the new design system applied (colors, typography, spacing, shared components)
- **D-15:** Auth/onboarding screens get branded treatment: TowLink logo, brand colors as background/accents, polished first-impression feel for capstone demo
- **D-16:** Map overlay components (trip sheets, request popup, finding driver modal) get a visual refresh — redesigned with consistent Card styling, proper shadows, rounded corners, brand colors
- **D-17:** Priority order if time runs short: Auth -> Commuter -> Driver -> Admin

### Claude's Discretion
- Exact hex values for the color palette (derived from logo analysis)
- Dark mode color mappings (inversions, surface colors, elevated surfaces)
- Spacing scale choice (4px vs 8px base)
- Shadow/elevation tokens
- Border radius scale
- Animation/transition details for component states
- Unistyles theme configuration and breakpoint setup
- How to migrate existing StyleSheet.create patterns to Unistyles

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Theme & Styling
- `constants/theme.ts` — Current color and font definitions (will be expanded/replaced by Unistyles theme)
- `logo/logo.png` — Brand logo asset, source for color palette derivation

### Components to Restyle
- `components/LoadingOverlay.tsx` — Phase 6 shared loading component, needs token migration
- `components/TripCompletionScreen.tsx` — Phase 7 shared completion screen, needs token migration
- `components/ActiveTripSheet.tsx` — Driver trip sheet, needs visual refresh
- `components/CommuterTripSheet.tsx` — Commuter trip sheet, needs visual refresh
- `components/RequestServiceSheet.tsx` — Service request bottom sheet, needs visual refresh
- `components/RequestPopup.tsx` — Driver request popup, needs visual refresh
- `components/FindingDriverModal.tsx` — Finding driver modal, needs visual refresh
- `components/InstructionCard.tsx` — Navigation instruction card, needs visual refresh
- `components/themed-text.tsx` — Existing themed text component, evaluate vs Unistyles
- `components/themed-view.tsx` — Existing themed view component, evaluate vs Unistyles

### Screen Groups to Restyle
- `app/(auth)/` — Login, signup, onboarding screens (branded treatment)
- `app/(commuter)/` — Commuter map and request screens
- `app/(driver)/` — Driver dashboard and trip screens
- `app/(admin)/` — Admin dashboard screens

### Library Documentation
- react-native-unistyles docs (fetch via web during research)
- expo-font docs for Inter font setup
- Inter font (Google Fonts)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `constants/theme.ts` — Has Colors (light/dark) and Fonts objects. Will serve as starting point but needs significant expansion or replacement with Unistyles theme
- `components/themed-text.tsx` / `components/themed-view.tsx` — Existing theme-aware components. May be superseded by Unistyles approach
- `components/ui/` — Has collapsible and icon-symbol components. New shared components (Button, Card, Input, Badge, Header) should live here
- `logo/logo.png` — Brand asset available for auth screen branding

### Established Patterns
- Every component uses `StyleSheet.create` with hardcoded hex values — these all need migration to Unistyles
- ~15+ screens across 4 route groups (auth, commuter, driver, admin)
- Bottom sheets (trip sheets, request sheet) are custom components, not a library — styling is fully controllable
- Toast notifications (Phase 6) and LoadingOverlay already exist as shared patterns

### Integration Points
- `app/_layout.tsx` — Root layout needs Unistyles provider/theme setup and expo-font loading
- `constants/theme.ts` — Will be restructured as the Unistyles theme definition
- `components/ui/` — New shared components directory
- Every screen file in `app/` — Token migration target

</code_context>

<specifics>
## Specific Ideas

- Logo prominently featured on auth/onboarding screens for branded first impression
- Professional & clean aesthetic inspired by the navy-blue shield logo
- Dark mode is important because app may be used during nighttime roadside emergencies
- Inter font chosen for distinctive branded look over system defaults

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-frontend-styling*
*Context gathered: 2026-03-30*
