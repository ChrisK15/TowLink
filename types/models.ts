export interface User {
	id: string;
	email: string;
	name?: string;
	role: 'commuter' | 'driver' | 'both' | null;
	phone?: string;
	createdAt: Date;
	rating?: number; // <- question mark means might not exist
}

export interface Driver {
	id: string;
	userId: string;
	isAvailable: boolean;
	isVerified: boolean;
	vehicleInfo: VehicleInfo;
	documents?: DriverDocuments;
	currentLocation: Location;
	geohash?: string;
	serviceRadius: number;
	rating?: number;
	totalTrips: number;
	lastLocationUpdate?: Date;
	isActivelyDriving?: boolean;
}

export interface VehicleInfo {
	make: string;
	model: string;
	year: number;
	licensePlate: string;
	towingCapacity: string;
}

export interface DriverDocuments {
	driversLicense?: string;
	vehicleRegistration?: string;
	insurance?: string;
}

export interface Location {
	latitude: number;
	longitude: number;
}

export type ServiceType =
	| 'tow'
	| 'jump_start'
	| 'fuel_delivery'
	| 'tire_change'
	| 'lockout'
	| 'winch_out';

export interface Request {
	id: string;
	commuterId: string;
	location: Location;
	dropoffLocation: Location;
	pickupAddress: string;
	dropoffAddress: string;
	serviceType: ServiceType;
	status: 'searching' | 'claimed' | 'matched' | 'accepted' | 'cancelled';
	matchedDriverId?: string; // only exists after being matched
	claimedByDriverId?: string;
	claimExpiresAt?: Date;
	notifiedDriverIds?: string[];
	createdAt: Date;
	expiresAt: Date;
	commuterName?: string;
	commuterPhone?: string;
	vehicleInfo?: VehicleInfo;
	estimatedPickupDistance?: number;
	totalTripDistance?: number;
	totalJobDistance?: number;
	estimatedETA?: number;
	customerNotes?: string;
	estimatedPrice?: number;
	additionalNotes?: string;
}

export interface Trip {
	id: string;
	requestId: string;
	commuterId: string;
	driverId: string;
	status: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
	pickupLocation: Location;
	dropoffLocation: Location;
	pickupAddress: string;
	dropoffAddress: string;
	startTime: Date;
	arrivalTime?: Date;
	completionTime?: Date;
	startedAt?: Date;
	distance: number;
	estimatedPrice: number;
	finalPrice?: number;
	driverPath: Location[]; // array of location points
}
