#!/bin/bash
set -e

echo "=== TowLink E2E Test Runner ==="
echo ""

# Check if emulators are running
if ! curl -s -o /dev/null http://localhost:8080/; then
  echo "ERROR: Firebase emulators are not running."
  echo "Start them in a separate terminal: npm run emulators"
  exit 1
fi

echo "1. Clearing and re-seeding emulator data..."
node scripts/seed-emulator.js

echo ""
echo "2. Granting location permission to app on iOS Simulator..."
xcrun simctl privacy booted grant location com.towlink.app 2>/dev/null || echo "   (skipped -- no booted simulator or permission already granted)"

echo ""
echo "3. Running Maestro tests..."
echo ""

# Run tests -- pass any arguments through (e.g., specific flow file)
if [ "$1" ]; then
  maestro test "$@"
else
  maestro test .maestro/
fi

echo ""
echo "=== E2E Tests Complete ==="
