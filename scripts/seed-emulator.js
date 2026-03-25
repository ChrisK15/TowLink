/**
 * Firebase Emulator Seed Script
 *
 * Creates deterministic test data in the Firebase emulator for Maestro E2E tests.
 * Run this AFTER the emulators are started with: npm run emulators
 *
 * Usage: node scripts/seed-emulator.js
 */

// Set emulator environment variables BEFORE requiring firebase-admin
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'towlink-71a59' });

const auth = admin.auth();
const db = admin.firestore();

async function clearFirestoreData() {
  console.log('Clearing Firestore emulator data...');
  try {
    const response = await fetch(
      'http://localhost:8080/emulator/v1/projects/towlink-71a59/databases/(default)/documents',
      { method: 'DELETE' },
    );
    if (!response.ok && response.status !== 404) {
      console.warn('Firestore clear returned status:', response.status);
    } else {
      console.log('Firestore data cleared.');
    }
  } catch (err) {
    console.warn('Could not clear Firestore (may be empty):', err.message);
  }
}

async function clearAuthUsers() {
  console.log('Clearing Auth emulator users...');
  try {
    const listResult = await auth.listUsers(1000);
    const uids = listResult.users.map((u) => u.uid);
    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      console.log(`Deleted ${uids.length} existing auth users.`);
    } else {
      console.log('No existing auth users to delete.');
    }
  } catch (err) {
    console.warn('Could not clear auth users (may be empty):', err.message);
  }
}

async function seed() {
  console.log('');
  console.log('=== TowLink Emulator Seed Script ===');
  console.log('');

  // Step 1: Clear existing data for deterministic state
  await clearFirestoreData();
  await clearAuthUsers();

  console.log('');
  console.log('Creating test users...');

  // Step 2: Create Auth users
  const commuterRecord = await auth.createUser({
    email: 'test-commuter@test.com',
    password: 'password123',
    displayName: 'Test Commuter',
  });
  console.log('  Created commuter:', commuterRecord.uid);

  const driverRecord = await auth.createUser({
    email: 'test-driver@test.com',
    password: 'password123',
    displayName: 'Test Driver',
  });
  console.log('  Created driver:', driverRecord.uid);

  const adminRecord = await auth.createUser({
    email: 'test-admin@test.com',
    password: 'password123',
    displayName: 'Test Admin',
  });
  console.log('  Created admin:', adminRecord.uid);

  const driver2Record = await auth.createUser({
    email: 'test-driver2@test.com',
    password: 'password123',
    displayName: 'Test Driver 2',
  });
  console.log('  Created driver2:', driver2Record.uid);

  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  console.log('');
  console.log('Creating Firestore documents...');

  // Step 3: Create company document
  await db.collection('companies').doc('test-company-01').set({
    name: 'Test Tow Yard',
    address: '123 Main St, Los Angeles, CA',
    serviceRadiusKm: 50,
    geohash: '9q5ctr', // geohash for LA area (34.0522, -118.2437)
    location: new admin.firestore.GeoPoint(34.0522, -118.2437),
    ownerUid: adminRecord.uid,
    authorizedEmails: ['test-driver@test.com', 'test-driver2@test.com'],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  Created company: test-company-01');

  // Step 4: Create user documents
  await db.collection('users').doc(commuterRecord.uid).set({
    email: 'test-commuter@test.com',
    role: 'commuter',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  Created user doc for commuter');

  await db.collection('users').doc(adminRecord.uid).set({
    email: 'test-admin@test.com',
    role: 'admin',
    companyId: 'test-company-01',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  Created user doc for admin');

  await db.collection('users').doc(driverRecord.uid).set({
    email: 'test-driver@test.com',
    role: 'driver',
    companyId: 'test-company-01',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  Created user doc for driver');

  await db.collection('users').doc(driver2Record.uid).set({
    email: 'test-driver2@test.com',
    role: 'driver',
    companyId: 'test-company-01',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  Created user doc for driver2');

  // Step 5: Create driver documents
  await db.collection('drivers').doc(driverRecord.uid).set({
    userId: driverRecord.uid,
    companyId: 'test-company-01',
    isAvailable: true,
    isActive: true,
    totalAssignmentsToday: 0,
    assignmentDate: today,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  Created driver doc for driver');

  await db.collection('drivers').doc(driver2Record.uid).set({
    userId: driver2Record.uid,
    companyId: 'test-company-01',
    isAvailable: true,
    isActive: true,
    totalAssignmentsToday: 0,
    assignmentDate: today,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  Created driver doc for driver2');

  // Step 6: Create authorized emails subcollection
  await db
    .collection('companies')
    .doc('test-company-01')
    .collection('authorizedEmails')
    .add({ email: 'test-driver@test.com' });
  await db
    .collection('companies')
    .doc('test-company-01')
    .collection('authorizedEmails')
    .add({ email: 'test-driver2@test.com' });
  console.log('  Created authorized emails for company');

  // Step 7: Create pre-claimed request for driver flow tests
  // IMPORTANT: Must use status:'claimed' and field name 'claimedByDriverId'
  // to match listenForClaimedRequests() query in services/firebase/firestore.ts
  // which queries: where('status', '==', 'claimed') AND where('claimedByDriverId', '==', driverId)
  await db.collection('requests').doc('test-request-claimed').set({
    commuterId: commuterRecord.uid,
    claimedByDriverId: driverRecord.uid,
    companyId: 'test-company-01',
    status: 'claimed',
    location: new admin.firestore.GeoPoint(34.0522, -118.2437),
    pickupAddress: '123 Main St, Los Angeles, CA',
    dropoffAddress: '456 Oak Ave, Los Angeles, CA',
    dropoffLocation: new admin.firestore.GeoPoint(34.0625, -118.241),
    serviceType: 'tow',
    estimatedPrice: 75,
    distanceMiles: 5.0,
    vehicleInfo: {
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      licensePlate: '',
      towingCapacity: '',
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('  Created pre-claimed request: test-request-claimed');

  // Step 8: Seed Phase 6 scenarios (completed trip, in-progress trip)
  await seedPhase6Scenarios(commuterRecord.uid, driverRecord.uid, 'test-company-01');

  console.log('');
  console.log('=== Seed complete! ===');
  console.log('');
  console.log('Test accounts:');
  console.log('  Commuter:  test-commuter@test.com / password123  uid:', commuterRecord.uid);
  console.log('  Driver:    test-driver@test.com   / password123  uid:', driverRecord.uid);
  console.log('  Driver 2:  test-driver2@test.com  / password123  uid:', driver2Record.uid);
  console.log('  Admin:     test-admin@test.com    / password123  uid:', adminRecord.uid);
  console.log('');
  console.log('Company:   test-company-01 (Test Tow Yard)');
  console.log('Request:   test-request-claimed (status: claimed, claimedByDriverId: driver uid)');
  console.log('');

  process.exit(0);
}

async function seedPhase6Scenarios(commuterId, driverId, companyId) {
  console.log('');
  console.log('Seeding Phase 6 scenarios...');

  // Completed trip
  await db.collection('trips').doc('seed-trip-completed').set({
    requestId: 'seed-request-completed',
    commuterId: commuterId,
    driverId: driverId,
    status: 'completed',
    pickupLocation: { latitude: 34.0522, longitude: -118.2437 },
    dropoffLocation: { latitude: 34.0622, longitude: -118.2537 },
    pickupAddress: '100 N Main St, Los Angeles, CA',
    dropoffAddress: '200 S Broadway, Los Angeles, CA',
    startTime: new Date(Date.now() - 3600000), // 1 hour ago
    arrivalTime: new Date(Date.now() - 2700000), // 45 min ago
    startedAt: new Date(Date.now() - 2400000), // 40 min ago
    completionTime: new Date(Date.now() - 1800000), // 30 min ago
    estimatedPrice: 75,
    finalPrice: 82.50,
    distance: 8.5,
    companyId: companyId,
    driverPath: [],
  });
  console.log('  Created completed trip: seed-trip-completed');

  // In-progress trip
  await db.collection('trips').doc('seed-trip-inprogress').set({
    requestId: 'seed-request-inprogress',
    commuterId: commuterId,
    driverId: driverId,
    status: 'in_progress',
    pickupLocation: { latitude: 34.0495, longitude: -118.2567 },
    dropoffLocation: { latitude: 34.0722, longitude: -118.2637 },
    pickupAddress: '300 W 1st St, Los Angeles, CA',
    dropoffAddress: '400 N Figueroa St, Los Angeles, CA',
    startTime: new Date(Date.now() - 1800000), // 30 min ago
    arrivalTime: new Date(Date.now() - 1200000), // 20 min ago
    startedAt: new Date(Date.now() - 600000), // 10 min ago
    estimatedPrice: 65,
    distance: 0,
    companyId: companyId,
    driverPath: [],
  });
  console.log('  Created in-progress trip: seed-trip-inprogress');

  // Matching request for completed trip
  await db.collection('requests').doc('seed-request-completed').set({
    commuterId: commuterId,
    matchedDriverId: driverId,
    companyId: companyId,
    status: 'accepted',
    location: new admin.firestore.GeoPoint(34.0522, -118.2437),
    pickupAddress: '100 N Main St, Los Angeles, CA',
    dropoffAddress: '200 S Broadway, Los Angeles, CA',
    dropoffLocation: new admin.firestore.GeoPoint(34.0622, -118.2537),
    serviceType: 'tow',
    estimatedPrice: 75,
    distanceMiles: 8.5,
    createdAt: new Date(Date.now() - 3700000),
    expiresAt: new Date(Date.now() + 3600000),
  });
  console.log('  Created request: seed-request-completed');

  // Matching request for in-progress trip
  await db.collection('requests').doc('seed-request-inprogress').set({
    commuterId: commuterId,
    matchedDriverId: driverId,
    companyId: companyId,
    status: 'accepted',
    location: new admin.firestore.GeoPoint(34.0495, -118.2567),
    pickupAddress: '300 W 1st St, Los Angeles, CA',
    dropoffAddress: '400 N Figueroa St, Los Angeles, CA',
    dropoffLocation: new admin.firestore.GeoPoint(34.0722, -118.2637),
    serviceType: 'tow',
    estimatedPrice: 65,
    distanceMiles: 0,
    createdAt: new Date(Date.now() - 1900000),
    expiresAt: new Date(Date.now() + 3600000),
  });
  console.log('  Created request: seed-request-inprogress');

  console.log('Phase 6 scenarios seeded: completed trip, in-progress trip');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
