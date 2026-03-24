# Demo Cheat Sheet — Thursday 2026-03-26

## Startup Sequence (15 min before)

```bash
# Terminal 1: Start emulators
npm run emulators

# Terminal 2: Seed data (after emulators are ready)
npm run emulators:seed

# Terminal 3: Start Expo with emulator flag
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true npx expo run:ios --device "iPhone 17 Pro"

# Install on second simulator
xcrun simctl install "iPhone 17" /Users/chris/Library/Developer/Xcode/DerivedData/towlink-frvqfzxruagrtzayfgaiulfpcmjy/Build/Products/Debug-iphonesimulator/towlink.app
xcrun simctl launch "iPhone 17" com.towlink.app
```

## Simulator Locations (Features > Location > Custom Location)

| Device | Role | Latitude | Longitude |
|--------|------|----------|-----------|
| iPhone 17 Pro | Commuter | `34.0522` | `-118.2437` |
| iPhone 17 | Driver | `34.0495` | `-118.2505` |

## Login Credentials

| Device | Email | Password |
|--------|-------|----------|
| iPhone 17 Pro (Commuter) | `test-commuter@test.com` | `password123` |
| iPhone 17 (Driver) | `test-driver@test.com` | `password123` |

## Demo Addresses

- **Pickup:** `717 S Olive St, Los Angeles, CA`
- **Dropoff:** `6001 W 3rd St, Los Angeles, CA`
- (~4-5 miles, ~$75 fare)

## Vehicle Info (for request form)

- Year: `2025`, Make: `Tesla`, Model: `Model 3`

## Pre-Demo Checklist

- [ ] Emulators running (check http://localhost:4000)
- [ ] Data seeded
- [ ] Both simulators open side-by-side
- [ ] Mock locations set on both devices
- [ ] Location permissions granted on both devices
- [ ] Logged in on both devices
- [ ] **Driver toggled Online** (do this BEFORE submitting request)
- [ ] No pre-existing requests in Firestore (re-seed if needed)

## Demo Script (~90 seconds)

| Step | Device | Action | Say |
|------|--------|--------|-----|
| 1 | Driver (right) | Toggle **Online** | *(do this quietly before demo starts)* |
| 2 | Commuter (left) | Submit tow request | "Our commuter is stranded. They request a tow — just enter their vehicle and location." |
| 3 | *(pause ~2s)* | System auto-dispatches | "No dispatcher needed — the system finds the nearest tow yard and assigns a driver automatically." |
| 4 | Driver (right) | Job popup appears, tap **Accept** | "The driver gets the request instantly — Sarah Johnson, pickup address, fare — and accepts." |
| 5 | Driver (right) | Show map with route | "Live directions to the commuter's location." |
| 6 | Commuter (left) | Show driver on map + ETA | "The commuter sees Mike Torres approaching with a live ETA. In production, this marker moves in real-time." |
| 7 | Driver (right) | Tap **Arrived** | "Driver arrives — one tap updates both sides instantly." |
| 8 | Both | Show status sync | "That's the full loop. Automated dispatch, real-time tracking, zero friction." |

## Panic Recovery

| Problem | Fix |
|---------|-----|
| Request doesn't appear on driver | Make sure driver is toggled **Online** before submitting |
| Emulators crashed | `npm run emulators` then `npm run emulators:seed` |
| App won't connect to emulators | Restart Expo: `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true npx expo start` |
| Stale data from previous run | Re-seed: `npm run emulators:seed`, restart both apps |
| Everything fails | Switch to pre-recorded backup video |
