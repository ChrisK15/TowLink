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
	serviceRadius: number;
	rating?: number;
	totalTrips: number;
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

export interface Request {
	id: string;
	commuterId: string;
	location: Location;
	dropoffLocation: Location;
	address: string;
	serviceType: 'tow';
	status: 'searching' | 'matched' | 'accepted' | 'cancelled';
	matchedDriverId?: string; // only exists after being matched
	createdAt: Date;
	expiresAt: Date;
}

export interface Trip {
	id: string;
	requestId: string;
	commuterId: string;
	driverId: string;
	status: 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
	pickupLocation: Location;
	dropoffLocation: Location;
	startTime: Date;
	arrivalTime?: Date;
	completionTime?: Date;
	distance: number;
	estimatedPrice: number;
	finalPrice?: number;
	driverPath: Location[]; // array of location points
}