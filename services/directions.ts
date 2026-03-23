// Google Directions API service with encoded polyline decoding
// Source: https://developers.google.com/maps/documentation/directions/get-directions
// Polyline algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm

export interface RouteStep {
	instruction: string; // HTML-stripped maneuver text
	maneuver: string; // "turn-right", "turn-left", "straight", etc.
	startLocation: { latitude: number; longitude: number };
	distanceMeters: number;
	distanceText: string; // "0.3 mi"
}

export interface DirectionsResult {
	polylineCoords: { latitude: number; longitude: number }[];
	steps: RouteStep[];
	durationSeconds: number;
	durationText: string; // "12 mins"
}

// Decode a Google Encoded Polyline string to an array of lat/lng coordinates.
// No npm package needed — the algorithm is ~20 lines.
export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
	const result: { latitude: number; longitude: number }[] = [];
	let index = 0,
		lat = 0,
		lng = 0;
	while (index < encoded.length) {
		let shift = 0,
			result_bits = 0,
			b: number;
		do {
			b = encoded.charCodeAt(index++) - 63;
			result_bits |= (b & 0x1f) << shift;
			shift += 5;
		} while (b >= 0x20);
		lat += result_bits & 1 ? ~(result_bits >> 1) : result_bits >> 1;
		shift = 0;
		result_bits = 0;
		do {
			b = encoded.charCodeAt(index++) - 63;
			result_bits |= (b & 0x1f) << shift;
			shift += 5;
		} while (b >= 0x20);
		lng += result_bits & 1 ? ~(result_bits >> 1) : result_bits >> 1;
		result.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
	}
	return result;
}

function parseStep(step: any): RouteStep {
	return {
		instruction: (step.html_instructions || '').replace(/<[^>]*>/g, ' ').trim(),
		maneuver: step.maneuver || 'straight',
		startLocation: {
			latitude: step.start_location.lat,
			longitude: step.start_location.lng,
		},
		distanceMeters: step.distance?.value ?? 0,
		distanceText: step.distance?.text ?? '',
	};
}

export async function fetchDirections(
	origin: { latitude: number; longitude: number },
	destination: { latitude: number; longitude: number },
): Promise<DirectionsResult | null> {
	const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

	if (!apiKey) {
		console.warn('Directions API key not configured');
		return null;
	}

	const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;

	try {
		const response = await fetch(url);
		const data = await response.json();

		if (data.status !== 'OK' || !data.routes.length) {
			console.warn('Directions API returned non-OK status:', data.status);
			return null;
		}

		const route = data.routes[0];
		const leg = route.legs[0];

		return {
			polylineCoords: decodePolyline(route.overview_polyline.points),
			steps: leg.steps.map(parseStep),
			durationSeconds: leg.duration.value,
			durationText: leg.duration.text,
		};
	} catch (error) {
		console.error('fetchDirections error:', error);
		return null;
	}
}
