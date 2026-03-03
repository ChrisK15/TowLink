import { Location } from '@/types/models';
import * as ExpoLocation from 'expo-location';
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

export function kmToMiles(km: number) {
	return km * 0.621371;
}

export function getGeohashQueryBounds(center: Location, radiusInKm: number) {
	return geohashQueryBounds(
		[center.latitude, center.longitude],
		radiusInKm * 1000,
	);
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
	const [place] = await ExpoLocation.reverseGeocodeAsync({ latitude, longitude });
	if (place?.city && place?.region) {
		const streetPart = [place.streetNumber, place.street].filter(Boolean).join(' ');
		return `${streetPart}, ${place.city}, ${place.region}`;
	}
	return `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
}
