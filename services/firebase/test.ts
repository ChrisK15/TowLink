import { collection } from 'firebase/firestore';
import { db } from './config';

export function testFirebaseConnection() {
	try {
		const testRef = collection(db, 'test');
		console.log('Firebase connected!');
		console.log('Project ID: ', db.app.options.projectId);
		return true;
	} catch (error) {
		console.error('Firebase connection failed: ', error);
		return false;
	}
}