import { Request } from '@/types/models';

// Creates dates (30 minutes from now)
const getExpiryDate = () => {
	const date = new Date();
	date.setMinutes(date.getMinutes() + 30);
	return date;
};

export const MOCK_REQUESTS: Request[] = [
	{
		id: 'mock_req_1',
		commuterId: 'commuter-1',
		location: { latitude: 34.2407, longitude: -118.53 },
		dropoffLocation: { latitude: 34.2321, longitude: -118.5541 },
		pickupAddress: '18111 Nordhoff St, Northridge, CA 91330',
		dropoffAddress: '8875 Tampa Ave, Northridge, CA 91324',
		serviceType: 'tow',
		status: 'searching',
		createdAt: new Date(),
		expiresAt: getExpiryDate(),
		commuterName: 'Chris Kelamyan',
		commuterPhone: '888-606-4263',
		vehicleInfo: {
			make: 'Tesla',
			model: 'Model 3',
			year: 2025,
			licensePlate: '0XXX000',
			towingCapacity: '',
		},
	},
	{
		id: 'mock_req_2',
		commuterId: 'commuter-2',
		location: { latitude: 34.0522, longitude: -118.2437 },
		dropoffLocation: { latitude: 34.0195, longitude: -118.4912 },
		pickupAddress: '800 W 1st St, Los Angeles, CA 90012',
		dropoffAddress: '1910 Ocean Way, Santa Monica, CA 90405',
		serviceType: 'tow',
		status: 'searching',
		createdAt: new Date(),
		expiresAt: getExpiryDate(),
		commuterName: 'Sarah Martinez',
		commuterPhone: '555-0187',
		vehicleInfo: {
			make: 'Honda',
			model: 'Civic',
			year: 2019,
			licensePlate: '7ABC123',
			towingCapacity: '',
		},
	},
	{
		id: 'mock_req_3',
		commuterId: 'commuter-3',
		location: { latitude: 34.0928, longitude: -118.3287 },
		dropoffLocation: { latitude: 34.1478, longitude: -118.1445 },
		pickupAddress: '6801 Hollywood Blvd, Los Angeles, CA 90028',
		dropoffAddress: '2800 E Observatory Rd, Los Angeles, CA 90027',
		serviceType: 'tow',
		status: 'searching',
		createdAt: new Date(),
		expiresAt: getExpiryDate(),
		commuterName: 'Michael Chen',
		commuterPhone: '555-0234',
		vehicleInfo: {
			make: 'Ford',
			model: 'F-150',
			year: 2021,
			licensePlate: '5XYZ789',
			towingCapacity: '',
		},
	},
];

export const getRandomMockRequest = (): Request => {
	const randomIndex = Math.floor(Math.random() * MOCK_REQUESTS.length);
	return MOCK_REQUESTS[randomIndex];
};
