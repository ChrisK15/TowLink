import {
	calculateETA,
	calculateFare,
	enrichRequestWithCalculations,
} from '@/services/requestCalculations';
import { Request } from '@/types/models';
import { Timestamp } from 'firebase/firestore';

// Mock geofire-common's distanceBetween so tests are deterministic
jest.mock('geofire-common', () => ({
	distanceBetween: jest.fn(),
	geohashForLocation: jest.fn(() => 'abc123'),
	geohashQueryBounds: jest.fn(() => []),
}));

import { distanceBetween } from 'geofire-common';
const mockDistanceBetween = distanceBetween as jest.MockedFunction<typeof distanceBetween>;

// ---------------------------------------------------------------------------
// calculateETA
// ---------------------------------------------------------------------------
describe('calculateETA', () => {
	it('returns 60 for 25 miles (25mph = 60 min)', () => {
		expect(calculateETA(25)).toBe(60);
	});

	it('returns 0 for 0 miles', () => {
		expect(calculateETA(0)).toBe(0);
	});

	it('returns 30 for 12.5 miles', () => {
		expect(calculateETA(12.5)).toBe(30);
	});

	it('rounds up (ceil) fractional minutes', () => {
		// 1 mile / 25 mph * 60 min = 2.4 min → ceil = 3
		expect(calculateETA(1)).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// calculateFare
// ---------------------------------------------------------------------------
describe('calculateFare', () => {
	it('returns 65 for 0 miles (minimum fare)', () => {
		expect(calculateFare(0)).toBe(65);
	});

	it('returns 65 for 1 mile (50 + 5*1 = 55, below minimum)', () => {
		expect(calculateFare(1)).toBe(65);
	});

	it('returns 65 for 3 miles (50 + 5*3 = 65, exactly at minimum)', () => {
		expect(calculateFare(3)).toBe(65);
	});

	it('returns 100 for 10 miles (50 + 5*10 = 100)', () => {
		expect(calculateFare(10)).toBe(100);
	});

	it('returns 150 for 20 miles (50 + 5*20 = 150)', () => {
		expect(calculateFare(20)).toBe(150);
	});
});

// ---------------------------------------------------------------------------
// enrichRequestWithCalculations
// ---------------------------------------------------------------------------
describe('enrichRequestWithCalculations', () => {
	const baseRequest: Request = {
		id: 'req-1',
		commuterId: 'commuter-1',
		location: { latitude: 34.05, longitude: -118.24 },
		// dropoffLocation intentionally omitted
		pickupAddress: '123 Main St',
		dropoffAddress: '456 Oak Ave',
		vehicleInfo: { year: 2020, make: 'Toyota', model: 'Camry', color: 'white' },
		estimatedPrice: 65,
		totalTripDistance: 3,
		serviceType: 'tow',
		status: 'searching',
		createdAt: Timestamp.now(),
		expiresAt: Timestamp.fromDate(new Date(Date.now() + 600000)),
	};

	const driverLocation = { latitude: 34.04, longitude: -118.23 };

	it('returns request unchanged when dropoffLocation is missing', () => {
		const result = enrichRequestWithCalculations(baseRequest, driverLocation);
		expect(result).toBe(baseRequest); // same reference — not modified
	});

	it('populates calculation fields when dropoffLocation is present', () => {
		// distanceBetween is called twice: driver->pickup, pickup->dropoff
		mockDistanceBetween
			.mockReturnValueOnce(2) // driver to pickup: 2 km
			.mockReturnValueOnce(5); // pickup to dropoff: 5 km

		const requestWithDropoff: Request = {
			...baseRequest,
			dropoffLocation: { latitude: 34.06, longitude: -118.25 },
		};

		const result = enrichRequestWithCalculations(requestWithDropoff, driverLocation);

		expect(result.estimatedPickupDistance).toBeDefined();
		expect(result.totalTripDistance).toBeDefined();
		expect(result.totalJobDistance).toBeDefined();
		expect(result.estimatedETA).toBeDefined();
		expect(result.estimatedPrice).toBeDefined();
	});
});
