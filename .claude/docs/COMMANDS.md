# TowLink - Command Reference

This document contains all the terminal commands you'll need for developing, deploying, and debugging the TowLink project.

**Last Updated**: 2026-02-20

---

## Table of Contents

- [Development Commands](#development-commands)
- [Firebase Commands](#firebase-commands)
- [Cloud Functions Commands](#cloud-functions-commands)
- [Package Management](#package-management)
- [TypeScript Commands](#typescript-commands)
- [Testing & Debugging](#testing--debugging)
- [Git Commands](#git-commands)
- [Troubleshooting Commands](#troubleshooting-commands)

---

## Development Commands

### Start Development Server

```bash
# Start Expo development server
npx expo start

# Start with specific platform
npm run android      # Android emulator
npm run ios         # iOS simulator
npm run web         # Web browser
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix linting issues automatically
npm run lint -- --fix
```

---

## Firebase Commands

### Authentication & Setup

```bash
# Login to Firebase
firebase login

# Initialize Firebase in project (one-time setup)
firebase init

# Check current project
firebase projects:list
firebase use
```

### Deploy Commands

```bash
# Deploy everything
firebase deploy

# Deploy only Cloud Functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Firestore indexes
firebase deploy --only firestore:indexes

# Deploy specific function
firebase deploy --only functions:matchDriverOnRequestCreate
```

### Emulators (Local Testing)

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore,functions

# Start with UI
firebase emulators:start --import=./emulator-data --export-on-exit
```

### View Logs

```bash
# View Cloud Function logs (real-time)
firebase functions:log

# View logs for specific function
firebase functions:log --only matchDriverOnRequestCreate

# View logs with limit
firebase functions:log --limit 50

# Follow logs (like tail -f)
firebase functions:log --follow
```

### Firestore Commands

```bash
# Open Firestore in browser
firebase open firestore

# Export Firestore data
firebase firestore:export gs://your-bucket/backup

# Import Firestore data
firebase firestore:import gs://your-bucket/backup
```

---

## Cloud Functions Commands

**Working Directory**: Always run these from `/functions` directory

```bash
cd functions
```

### Build & Development

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Build and watch for changes
npm run build:watch

# Run locally with emulator
npm run serve

# Open functions shell (interactive testing)
npm run shell
```

### Deploy Functions

```bash
# From project root
firebase deploy --only functions

# From functions directory
npm run deploy
```

### View Function Logs

```bash
# From functions directory
npm run logs

# Or from project root
firebase functions:log
```

### Install Additional Dependencies

```bash
# Example: Install geofire-common in functions
cd functions
npm install geofire-common
cd ..
```

---

## Package Management

### Install Packages

```bash
# Install main app dependency
npm install <package-name>

# Install dev dependency
npm install --save-dev <package-name>

# Install Cloud Functions dependency
cd functions
npm install <package-name>
cd ..
```

### Update & Audit

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities (automatic)
npm audit fix

# Fix vulnerabilities (force - be careful!)
npm audit fix --force
```

### Clean Install

```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clean install from lockfile (CI/CD)
npm ci
```

---

## TypeScript Commands

### Type Checking

```bash
# Check types without emitting files
npx tsc --noEmit

# Check types in functions directory
cd functions
npx tsc --noEmit
cd ..
```

### Build TypeScript

```bash
# Build Cloud Functions
cd functions
npm run build
cd ..
```

### Watch Mode

```bash
# Watch and rebuild on changes
cd functions
npm run build:watch
cd ..
```

---

## Testing & Debugging

### Check App State

```bash
# Check if Expo is running
ps aux | grep expo

# Kill stuck Expo process
killall node
```

### Firestore Debugging

```bash
# Query Firestore from CLI (requires jq)
firebase firestore:get /requests/REQUEST_ID

# List all documents in collection
firebase firestore:list /requests
```

### View Mobile Logs

```bash
# iOS logs (if running on simulator)
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Expo"'

# Android logs (if running on emulator)
adb logcat | grep ReactNativeJS
```

### Network Debugging

```bash
# Check Firebase connection
curl -I https://firestore.googleapis.com

# Test Cloud Functions endpoint
curl https://us-west2-towlink-71a59.cloudfunctions.net/matchDriverOnRequestCreate
```

---

## Git Commands

### Basic Workflow

```bash
# Check status
git status

# Stage files
git add <file>
git add .                    # Add all files (use carefully!)

# Commit
git commit -m "message"

# Push to remote
git push

# Push and set upstream
git push -u origin branch-name
```

### Branching

```bash
# Create new branch
git checkout -b feature-name

# Switch branches
git checkout branch-name

# List branches
git branch
git branch -a                # Include remote branches

# Delete branch
git branch -d branch-name
```

### Pull Requests

```bash
# Create PR using GitHub CLI
gh pr create --title "Title" --body "Description"

# View PR
gh pr view

# List PRs
gh pr list

# Merge PR
gh pr merge
```

### Viewing Changes

```bash
# See unstaged changes
git diff

# See staged changes
git diff --cached

# See recent commits
git log --oneline -10
```

---

## Troubleshooting Commands

### Clear Caches

```bash
# Clear Expo cache
npx expo start --clear

# Clear npm cache
npm cache clean --force

# Clear TypeScript build cache
cd functions
rm -rf lib/
npm run build
cd ..
```

### Port Issues

```bash
# Check what's using port 19000 (Expo)
lsof -i :19000

# Kill process on port
kill -9 $(lsof -t -i:19000)

# Check Firebase emulator ports
lsof -i :8080    # Firestore
lsof -i :5001    # Functions
lsof -i :9099    # Auth
```

### Firebase Auth Issues

```bash
# Re-login to Firebase
firebase logout
firebase login

# Check current project
firebase use

# Switch project
firebase use <project-id>
```

### Node Version Issues

```bash
# Check Node version
node --version

# Check npm version
npm --version

# Use specific Node version (if using nvm)
nvm use 22
```

### Package Lock Sync Issues

```bash
# When package-lock.json is out of sync
rm -rf node_modules package-lock.json
npm install

# Or in functions/
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..
```

---

## Specialized Commands from TOW-52

### Geohash Testing

```bash
# No direct CLI, but useful queries in Firestore Console:
# Query drivers by geohash range:
# where('geohash', '>=', 'drt2') AND where('geohash', '<=', 'drt3')
```

### Cloud Function Debugging

```bash
# View function execution details
firebase functions:log --only matchDriverOnRequestCreate --limit 20

# View timeout handler logs
firebase functions:log --only handleClaimTimeouts --limit 10

# View errors only
firebase functions:log --min-severity ERROR
```

### Transaction Testing

```bash
# No direct CLI - test via Firestore Console or app
# Manually update documents to test transaction conflicts
```

---

## Quick Reference: Most Common Commands

```bash
# Daily development
npx expo start                          # Start app
firebase deploy --only functions        # Deploy functions
firebase functions:log                  # View logs
npm run lint                           # Check code quality

# When things break
npx expo start --clear                 # Clear cache and restart
rm -rf node_modules && npm install     # Reinstall packages
firebase logout && firebase login      # Re-auth Firebase

# Cloud Functions workflow
cd functions                           # Enter functions dir
npm run build                          # Build TypeScript
cd .. && firebase deploy --only functions  # Deploy
firebase functions:log                 # Check logs

# Type checking
npx tsc --noEmit                       # Check main app types
cd functions && npx tsc --noEmit       # Check functions types

# Git workflow
git status                             # Check changes
git add <files>                        # Stage changes
git commit -m "message"                # Commit
git push                               # Push to remote
gh pr create                           # Create PR
```

---

## Environment Variables

### Required Files

- **`.env`** - Local environment variables (not in git)
- **`.env.example`** - Template for environment variables (in git)

### Loading Environment Variables

```bash
# Expo automatically loads .env files
# Access in code:
# import Constants from 'expo-constants';
# const apiKey = Constants.expoConfig?.extra?.firebaseApiKey;
```

---

## Firebase Regions

**Important**: This project uses **us-west2** region for Cloud Functions.

Always deploy with region awareness:
```typescript
// In functions/src/index.ts
import { setGlobalOptions } from 'firebase-functions/options';
setGlobalOptions({ region: 'us-west2' });
```

---

## Cost Monitoring

### Check Firebase Usage

```bash
# No CLI command - use Firebase Console:
# https://console.firebase.google.com/project/towlink-71a59/usage

# Useful links:
# - Firestore usage
# - Functions invocations
# - Storage usage
```

---

## Helpful Aliases (Optional Setup)

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# TowLink project shortcuts
alias tow="cd /Users/chris/projects/towlink"
alias tow-start="npx expo start"
alias tow-deploy="firebase deploy --only functions"
alias tow-logs="firebase functions:log"
alias tow-build="cd functions && npm run build && cd .."

# Firebase shortcuts
alias fb="firebase"
alias fbl="firebase functions:log"
alias fbd="firebase deploy --only functions"
```

Then reload your shell:
```bash
source ~/.zshrc    # or ~/.bashrc
```

---

## Resources

- **Firebase CLI Docs**: https://firebase.google.com/docs/cli
- **Expo CLI Docs**: https://docs.expo.dev/more/expo-cli/
- **npm Docs**: https://docs.npmjs.com/cli/
- **Git Docs**: https://git-scm.com/docs

---

## Notes

- Always run Cloud Functions commands from the `/functions` directory unless using `firebase deploy` from root
- Check your current directory before running commands: `pwd`
- Use `--help` flag with any command to see available options: `firebase deploy --help`
- Keep your `node_modules` and `package-lock.json` in sync between root and functions directories

---

_This reference is maintained as part of the TowLink project documentation._
_For project-specific patterns and architecture, see `.claude/docs/ARCHITECTURE.md`_
