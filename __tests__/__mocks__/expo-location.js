/* global jest */
// Mock for expo-location — prevents native module loading in Node/Jest environment
module.exports = {
	geocodeAsync: jest.fn(() => Promise.resolve([])),
	reverseGeocodeAsync: jest.fn(() => Promise.resolve([])),
	requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
	getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
	watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
};
