import { Location, Request } from '@/types/models';
import { getDistanceInKm, kmToMiles } from './geoLocationUtils';

export function calculateDistanceMiles(
	point1: Location,
	point2: Location,
): number {
	return Math.round(kmToMiles(getDistanceInKm(point1, point2)) * 10) / 10;
}

export function calculateETA(distanceMiles: number): number {
	return Math.ceil((distanceMiles / 25) * 60); // minutes
}

export function calculateFare(tripDistanceMiles: number): number {
	return Math.max(65, Math.round(50 + 5 * tripDistanceMiles));
}

export function enrichRequestWithCalculations(
	request: Request,
	driverLocation: Location,
): Request {
	if (!request.dropoffLocation) return request;
	const estimatedPickupDistance = calculateDistanceMiles(
		driverLocation,
		request.location,
	);
	const totalTripDistance = calculateDistanceMiles(
		request.location,
		request.dropoffLocation,
	);
	const totalJobDistance =
		Math.round((estimatedPickupDistance + totalTripDistance) * 10) / 10;
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
