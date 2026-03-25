import { decodePolyline } from '@/services/directions';

describe('decodePolyline', () => {
	it('returns empty array for empty string', () => {
		expect(decodePolyline('')).toEqual([]);
	});

	it('decodes a known Google polyline to expected coordinates', () => {
		// Google polyline algorithm reference example:
		// Encodes (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
		// Encoded: _p~iF~ps|U_ulLnnqC_mqNvxq`@
		// Source: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
		const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
		const result = decodePolyline(encoded);

		expect(result).toHaveLength(3);
		expect(result[0].latitude).toBeCloseTo(38.5, 4);
		expect(result[0].longitude).toBeCloseTo(-120.2, 4);
		expect(result[1].latitude).toBeCloseTo(40.7, 4);
		expect(result[1].longitude).toBeCloseTo(-120.95, 4);
		expect(result[2].latitude).toBeCloseTo(43.252, 4);
		expect(result[2].longitude).toBeCloseTo(-126.453, 4);
	});

	it('returns objects with latitude and longitude number properties', () => {
		const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
		const result = decodePolyline(encoded);

		for (const coord of result) {
			expect(typeof coord.latitude).toBe('number');
			expect(typeof coord.longitude).toBe('number');
		}
	});

	it('decodes a single-point polyline', () => {
		// Encode (0, 0): both lat=0 and lng=0
		// 0 encodes to '?'
		const encoded = '??';
		const result = decodePolyline(encoded);
		expect(result).toHaveLength(1);
		expect(result[0].latitude).toBe(0);
		expect(result[0].longitude).toBe(0);
	});
});
