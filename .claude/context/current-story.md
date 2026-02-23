# Current Story: TOW-71

## Story Details
- **ID**: TOW-71
- **Title**: FE Sprint 1 - General Onboarding Flow up to Role Selection
- **Epic**: N/A (standalone frontend task)
- **Priority**: Medium
- **Sprint**: TOW Sprint 2 (Feb 12 - Feb 24, 2026)
- **Story Points**: Not estimated
- **Status**: To Do
- **Assignee**: ltahmasian24
- **Jira Link**: https://chriskelamyan115.atlassian.net/browse/TOW-71

## Description
Create the general frontend onboarding flow with the following four screens (no backend logic, pure UI):

1. **Welcome Screen** - "Welcome to TowLink" with location pin icon and tagline
2. **Fast & Reliable Screen** - Lightning bolt icon with feature highlight
3. **Safe & Secure Screen** - Shield icon with feature highlight
4. **Role Selection Screen** - "I want to..." card selection between Customer and Driver

Design reference files are located at:
- `/Users/loris/TowLink/.claude/design/screens/onboarding_flow/General Flow.png`
- `/Users/loris/TowLink/.claude/design/screens/onboarding_flow/Welcome Screen.png`
- `/Users/loris/TowLink/.claude/design/screens/onboarding_flow/Fast & Reliable.png`
- `/Users/loris/TowLink/.claude/design/screens/onboarding_flow/Get Started.png` (Safe & Secure screen)
- `/Users/loris/TowLink/.claude/design/screens/onboarding_flow/Role Selection.png`

## Acceptance Criteria
- [ ] Screen 1 - Welcome Screen:
  - TowLink logo/icon + "TowLink" branding in header
  - "Roadside Assistance On-Demand" subtitle in header
  - Dark mode toggle in top-right corner
  - Large location pin icon centered in a light blue circle
  - Bold "Welcome to TowLink" heading
  - Subtext: "The fastest way to get roadside assistance or earn money helping others on the road."
  - Pagination dots (active dot highlighted in blue)
  - "Next" button with arrow at the bottom

- [ ] Screen 2 - Fast & Reliable Screen:
  - Same header as Welcome Screen
  - Lightning bolt icon centered in a light blue circle
  - Bold "Fast & Reliable" heading
  - Subtext: "Connect in minutes. Real-time tracking and in-app communication for a seamless experience."
  - Pagination dots (second dot active)
  - "Next" button with arrow at the bottom

- [ ] Screen 3 - Safe & Secure Screen:
  - Same header as Welcome Screen
  - Shield icon centered in a light blue circle
  - Bold "Safe & Secure" heading
  - Subtext: "All users are verified. Ratings and reviews ensure quality service every time."
  - Pagination dots (third dot active)
  - "Get Started" button with arrow at the bottom (button label changes on last feature screen)

- [ ] Screen 4 - Role Selection Screen:
  - Header: "Choose how you want to use TowLink"
  - Dark mode toggle in top-right corner
  - "I want to..." heading
  - Card 1: "Get Roadside Assistance" - person icon, description, "Continue as Customer ->" link
  - Card 2: "Drive & Earn Money" - truck icon, description, "Continue as Driver ->" link
  - "Administrative Access" option at the bottom with shield icon

- [ ] Navigation flow: Welcome -> Fast & Reliable -> Safe & Secure -> Role Selection
- [ ] Tapping "Continue as Customer" routes to commuter flow
- [ ] Tapping "Continue as Driver" routes to driver flow

## Screen-by-Screen Design Details

### Welcome Screen
- Header: TowLink logo + name, "Roadside Assistance On-Demand" tagline, dark mode moon icon
- Center icon: Blue location pin on light blue circular background
- H1: "Welcome to TowLink"
- Body text: "The fastest way to get roadside assistance or earn money helping others on the road."
- Progress dots: 3 dots, first active (filled blue)
- CTA: Full-width blue "Next" button with right arrow

### Fast & Reliable Screen
- Same header as Welcome
- Center icon: Blue lightning bolt on light blue circular background
- H1: "Fast & Reliable"
- Body text: "Connect in minutes. Real-time tracking and in-app communication for a seamless experience."
- Progress dots: 3 dots, second active
- CTA: Full-width blue "Next" button with right arrow

### Safe & Secure Screen
- Same header as Welcome
- Center icon: Blue shield on light blue circular background
- H1: "Safe & Secure"
- Body text: "All users are verified. Ratings and reviews ensure quality service every time."
- Progress dots: 3 dots, third active
- CTA: Full-width blue "Get Started" button with right arrow

### Role Selection Screen
- Header subtitle changes to: "Choose how you want to use TowLink"
- No progress dots
- Large "I want to..." heading
- Two bordered cards:
  - Card 1: light blue person icon | "Get Roadside Assistance" (bold) | description | "Continue as Customer ->" (blue link)
  - Card 2: light blue truck icon | "Drive & Earn Money" (bold) | description | "Continue as Driver ->" (blue link)
- Bottom section: "Administrative Access" with shield icon and right arrow (subtle, smaller)

## Dependencies
- No backend dependencies - this is a pure frontend/UI story
- Uses Expo Router for navigation between screens
- Should integrate with the existing app navigation structure
- Git branch already created: `TOW-71-fe-sprint-1-general-onboarding-flow-up-to-role-selection`
- Role Selection choices should eventually route to existing commuter/driver flows

## Next Steps
Invoke the `technical-architect` agent to create a detailed implementation specification for this story. Key areas to cover:

1. Where to place onboarding screens in the Expo Router file structure
2. How to implement the 3-screen slideshow/swiper (flat list, scroll view, or library)
3. Pagination dot component implementation
4. Role Selection card component design
5. Navigation wiring to existing commuter and driver screens
6. Dark mode toggle consideration (whether to implement now or stub it)
7. Whether to use AsyncStorage to skip onboarding on repeat app opens

**Command**: Use `technical-architect` to analyze TOW-71 and create implementation specs
