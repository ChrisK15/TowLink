# Technology Stack

**Analysis Date:** 2026-03-13

## Languages

**Primary:**
- TypeScript 5.9.2 - Entire application (app/, services/, types/)
- JavaScript - Configuration files (app.config.js, babel.config.js, eslint.config.js)

## Runtime

**Environment:**
- Node.js - Development environment
- Expo 54.0.32 - React Native development platform and CLI
- React Native 0.81.5 - Mobile application framework

**Package Manager:**
- npm - Primary package manager
- Lockfile: package-lock.json (inferred from npm usage)

## Frameworks

**Core:**
- React 19.1.0 - UI library
- React Native 0.81.5 - Native cross-platform runtime
- Expo Router 6.0.22 - File-based routing with tab navigation
- Expo 54.0.32 - Development framework and build system

**Navigation:**
- @react-navigation/native 7.1.8 - Navigation infrastructure
- @react-navigation/bottom-tabs 7.4.0 - Tab-based navigation UI
- @react-navigation/elements 2.6.3 - Navigation elements

**UI & Animations:**
- expo-router 6.0.22 - File-based routing
- @gorhom/bottom-sheet 5.2.8 - Bottom sheet modal component
- react-native-reanimated 4.1.1 - Animation library
- react-native-gesture-handler 2.28.0 - Gesture recognition
- react-native-safe-area-context 5.6.0 - Safe area handling
- react-native-screens 4.16.0 - Native screen optimization

**Web Support:**
- react-native-web 0.21.0 - Web runtime for React Native
- react-dom 19.1.0 - React DOM for web

**Development:**
- Babel - JavaScript transpilation (babel-preset-expo, react-native-reanimated/plugin)
- ESLint 9.25.0 - Linting (eslint-config-expo)

## Key Dependencies

**Critical:**
- firebase 12.4.0 - BaaS platform (Authentication, Firestore, Storage)
- geofire-common 6.0.0 - Geospatial querying and hashing
- @react-native-async-storage/async-storage 2.2.0 - Local persistent storage

**Geolocation & Maps:**
- react-native-maps 1.20.1 - Native map components
- expo-location 19.0.8 - GPS location access and geocoding

**Expo Modules (Device APIs):**
- expo-constants 18.0.9 - App constants and build info
- expo-font 14.0.9 - Custom font loading
- expo-haptics 15.0.8 - Haptic feedback
- expo-image 3.0.11 - Advanced image component
- expo-linking 8.0.11 - Deep linking support
- expo-splash-screen 31.0.13 - Splash screen control
- expo-status-bar 3.0.9 - Status bar styling
- expo-symbols 1.0.8 - SF Symbols support (iOS)
- expo-system-ui 6.0.9 - System UI customization
- expo-web-browser 15.0.10 - Native browser integration
- @expo/vector-icons 15.0.2 - Icon library (Material, Feather, etc.)

**Native Worklets:**
- react-native-worklets 0.5.1 - Background task execution

## Configuration

**Environment:**
- Environment variables: `EXPO_PUBLIC_*` prefixed variables stored in `.env`
- Exposed to app: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- Key configs: `.env` file (not committed to git)

**Build:**
- `app.config.js` - Expo configuration with Google Maps API injection, Android edge-to-edge enabled, new architecture enabled, experimental features (typedRoutes, reactCompiler)
- `tsconfig.json` - TypeScript with strict mode enabled, path alias `@/*` for root imports
- `babel.config.js` - Babel configuration with Expo preset and React Native Reanimated plugin
- `eslint.config.js` - ESLint with expo flat config
- `prettier` config in `package.json` - Single quotes, 2-space tabs, no semicolons

## Platform Requirements

**Development:**
- Node.js (version not explicitly specified in package.json)
- npm
- Expo CLI (included via expo package)
- Xcode (for iOS simulator testing)
- Android Studio or Emulator (for Android testing)

**Production:**
- iOS 13+ (Apple iPhone/iPad)
- Android 6.0+ (minimum SDK determined by Expo 54)
- Deployment: Expo App (development) or EAS Build/Expo Go (testing), custom standalone builds via EAS or local build tools

## New Architecture

**Enabled:**
- `newArchEnabled: true` in app.config.js - Using React Native New Architecture (Fabric + TurboModules)

---

*Stack analysis: 2026-03-13*
