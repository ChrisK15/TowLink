import { Location } from '@/types/models';
import { getDistanceInKm, kmToMiles } from './geoLocationUtils';

export function calculateDistanceMiles(point1: Location, point2: Location) {
	return kmToMiles(getDistanceInKm(point1, point2));
}

export function calculateETA(distanceMiles: number) {
	return Math.ceil((distanceMiles / 25) * 60); // minutes
}
