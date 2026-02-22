import { Location, Request } from '@/types/models';
import { getDistanceInKm, kmToMiles } from './geoLocationUtils';

export function calculateDistanceMiles(point1: Location, point2: Location) {
	return Math.round(kmToMiles(getDistanceInKm(point1, point2)) * 10) / 10;
}

export function calculateETA(distanceMiles: number) {
	return Math.ceil((distanceMiles / 25) * 60); // minutes
}

export function calculateFare(tripDistanceMiles: number) {
	return Math.max(65, Math.round(50 + 5 * tripDistanceMiles));
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
	const totalJobDistance = estimatedPickupDistance + totalTripDistance;
	const estimatedETA = calculateETA(estimatedPickupDistance);
	const estimatedPrice = calculateFare(totalTripDistance);

	return {
		...request,
		estimatedPickupDistance,
		totalTripDistance,
		totalJobDistance,
		estimatedETA,
		estimatedPrice,
	};
}
