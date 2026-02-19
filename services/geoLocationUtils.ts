import { Location } from '@/types/models';
import {
	distanceBetween,
	geohashForLocation,
	geohashQueryBounds,
} from 'geofire-common';

export function getGeohash(latitude: number, longitude: number): string {
	return geohashForLocation([latitude, longitude]);
}

export function getDistanceInKm(point1: Location, point2: Location): number {
	return distanceBetween(
		[point1.latitude, point1.longitude],
		[point2.latitude, point2.longitude],
	);
}

export function getGeohashQueryBounds(center: Location, radiusInKm: number) {
	return geohashQueryBounds(
		[center.latitude, center.longitude],
		radiusInKm * 1000,
	);
}
