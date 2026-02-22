import { Location, Request } from '@/types/models';
import { getDistanceInKm, kmToMiles } from './geoLocationUtils';

export function calculateDistanceMiles(point1: Location, point2: Location) {
	return kmToMiles(getDistanceInKm(point1, point2));
}

export function calculateETA(distanceMiles: number) {
	return Math.ceil((distanceMiles / 25) * 60); // minutes
}

export function calculateFare(tripDistanceMiles: number) {
	return Math.max(65, 50 + 5 * tripDistanceMiles);
}

export function enrichRequestWithCalculations(
	request: Request,
	driverLocation: Location,
): Request {
	const estimatedPickupDistance = calculateDistanceMiles(
		driverLocation,
		request.location,
	);
	const totalTripDistance = calculateDistanceMiles(
		request.location,
		request.dropoffLocation,
	);
	const estimatedETA = calculateETA(estimatedPickupDistance);
	const estimatedPrice = calculateFare(totalTripDistance);

	return {
		...request,
		estimatedPickupDistance,
		totalTripDistance,
		estimatedETA,
		estimatedPrice,
	};
}
