import { kmToMiles, getDistanceInKm } from '@/services/geoLocationUtils';

// Mock geofire-common so tests are deterministic and don't need native modules
jest.mock('geofire-common', () => ({
	distanceBetween: jest.fn(),
	geohashForLocation: jest.fn(() => 'abc123'),
	geohashQueryBounds: jest.fn(() => []),
}));

// Mock expo-location to avoid native module resolution in Node
jest.mock('expo-location', () => ({
	geocodeAsync: jest.fn(),
	reverseGeocodeAsync: jest.fn(),
}));

import { distanceBetween } from 'geofire-common';
const mockDistanceBetween = distanceBetween as jest.MockedFunction<typeof distanceBetween>;

// ---------------------------------------------------------------------------
// kmToMiles
// ---------------------------------------------------------------------------
describe('kmToMiles', () => {
	it('returns 0 for 0 km', () => {
		expect(kmToMiles(0)).toBe(0);
	});

	it('returns ~0.621371 for 1 km', () => {
		expect(kmToMiles(1)).toBeCloseTo(0.621371, 5);
	});

	it('returns ~6.21371 for 10 km', () => {
		expect(kmToMiles(10)).toBeCloseTo(6.21371, 4);
	});
});

// ---------------------------------------------------------------------------
// getDistanceInKm
// ---------------------------------------------------------------------------
describe('getDistanceInKm', () => {
	it('passes correct [lat, lng] arrays to distanceBetween', () => {
		mockDistanceBetween.mockReturnValue(10);

		const point1 = { latitude: 34.05, longitude: -118.24 };
		const point2 = { latitude: 34.06, longitude: -118.25 };

		const result = getDistanceInKm(point1, point2);

		expect(mockDistanceBetween).toHaveBeenCalledWith(
			[point1.latitude, point1.longitude],
			[point2.latitude, point2.longitude],
		);
		expect(result).toBe(10);
	});

	it('returns the value from distanceBetween', () => {
		mockDistanceBetween.mockReturnValue(42.5);
		const result = getDistanceInKm(
			{ latitude: 0, longitude: 0 },
			{ latitude: 1, longitude: 1 },
		);
		expect(result).toBe(42.5);
	});
});
