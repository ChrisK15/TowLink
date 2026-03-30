# Phase 8: Frontend Styling & Global App Style - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 08-frontend-styling
**Areas discussed:** Brand identity & color palette, Typography & spacing scale, Component styling approach, Screen-by-screen polish scope

---

## Brand Identity & Color Palette

### Color Palette Source

| Option | Description | Selected |
|--------|-------------|----------|
| Derive from logo (Recommended) | Extract primary/accent colors from TowLink logo, build palette around them | ✓ |
| Fresh palette, independent of logo | Choose colors based on towing/roadside domain (safety orange, highway blue) | |
| You decide | Claude picks a professional palette | |

**User's choice:** Derive from logo
**Notes:** Logo is a navy-to-medium blue shield with tow hook/chain icon

### Visual Tone

| Option | Description | Selected |
|--------|-------------|----------|
| Professional & clean (Recommended) | Navy primary, white backgrounds, subtle blue accents. Trustworthy feel | ✓ |
| Bold & vibrant | Bright blues as primary action colors, saturated UI. Energetic feel | |
| Minimal & neutral | Mostly whites/grays with blue only for key actions | |

**User's choice:** Professional & clean

### Dark Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Light-only for v1 (Recommended) | One theme to get right. Simplifies styling pass | |
| Both light and dark | Full dark mode support. Better UX at night for roadside emergencies | ✓ |
| You decide | Claude evaluates effort vs value | |

**User's choice:** Both light and dark
**Notes:** Dark mode relevant for nighttime roadside emergencies

### Status Colors

| Option | Description | Selected |
|--------|-------------|----------|
| Universal colors (Recommended) | Green success, amber warning, red error, blue info | ✓ |
| Brand-tinted status colors | Shift status colors toward blue palette | |

**User's choice:** Universal colors

---

## Typography & Spacing Scale

### Font Choice

| Option | Description | Selected |
|--------|-------------|----------|
| System fonts (Recommended) | SF Pro / Roboto. Zero bundle size, native feel | |
| Custom font (Inter) | Popular, readable sans-serif. ~100KB, distinctive branded look | ✓ |
| You decide | Claude picks | |

**User's choice:** Custom font (Inter)

### Spacing Approach

| Option | Description | Selected |
|--------|-------------|----------|
| 4px base grid (Recommended) | Tokens at 4, 8, 12, 16, 24, 32, 48 | |
| 8px base grid | Tokens at 8, 16, 24, 32, 48, 64 | |
| You decide | Claude picks based on app density needs | ✓ |

**User's choice:** You decide (Claude's discretion)

### Typography Scale

| Option | Description | Selected |
|--------|-------------|----------|
| Compact (5 sizes) (Recommended) | caption 12, body 14, subtitle 16, title 20, heading 24 | ✓ |
| Extended (7+ sizes) | More granular with tiny 10 through hero 32 | |
| You decide | Claude picks | |

**User's choice:** Compact (5 sizes)

---

## Component Styling Approach

### Style Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Expanded theme.ts tokens (Recommended) | Add tokens to existing theme.ts. Components import constants | |
| Utility style library (Unistyles) | react-native-unistyles for Tailwind-like styling with dark mode | ✓ |
| You decide | Claude evaluates | |

**User's choice:** Unistyles

### Button Component

| Option | Description | Selected |
|--------|-------------|----------|
| Shared Button component (Recommended) | One Button with variants: primary, secondary, destructive, ghost | ✓ |
| Style tokens only | Define button tokens but each screen composes its own | |
| You decide | Claude decides | |

**User's choice:** Shared Button component

### Additional Shared Components

| Option | Description | Selected |
|--------|-------------|----------|
| Card (surface container) | Consistent shadow, border-radius, padding | ✓ |
| Input / TextInput | Styled input with label, error state, focus ring | ✓ |
| Badge / Status chip | Colored badges for trip status | ✓ |
| Header / AppBar | Consistent screen header component | ✓ |

**User's choice:** All four selected

---

## Screen-by-Screen Polish Scope

### Restyle Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full restyle all screens (Recommended) | Every screen gets new design system applied | ✓ |
| Core screens only | Main flows restyled, admin gets token updates only | |
| Tokens only, minimal layout changes | Swap hardcoded values, no layout changes | |

**User's choice:** Full restyle all screens

### Auth Screen Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Branded (Recommended) | Logo on login/signup, brand colors, polished onboarding | ✓ |
| Functional only | Clean forms with new tokens, no special branding | |
| You decide | Claude decides | |

**User's choice:** Branded

### Map Overlay Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Visual refresh (Recommended) | Redesign sheets/modals with Card styling, shadows, brand colors | ✓ |
| Token alignment only | Swap hardcoded colors/sizes, keep layouts | |

**User's choice:** Visual refresh

### Priority Order

| Option | Description | Selected |
|--------|-------------|----------|
| Auth -> Commuter -> Driver -> Admin | First impressions first | ✓ |
| Commuter -> Driver -> Auth -> Admin | Core experience first | |
| You decide | Claude orders by effort-to-impact | |

**User's choice:** Auth -> Commuter -> Driver -> Admin

---

## Claude's Discretion

- Exact hex values for color palette (derived from logo)
- Dark mode color mappings
- Spacing scale (4px vs 8px base)
- Shadow/elevation tokens
- Border radius scale
- Unistyles theme configuration
- Migration strategy from StyleSheet.create to Unistyles

## Deferred Ideas

None — discussion stayed within phase scope
