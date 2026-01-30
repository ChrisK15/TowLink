import { signUpWithEmail } from '@/services/firebase/authService';
import { useState } from 'react';
import { Text, View } from 'react-native';

export default function SignupScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSignup = async () => {
		setError('');

		if (!email || !password || !confirmPassword) {
			setError('All fields are required.');
			return;
		}
		if (!email.includes('@')) {
			setError('Invalid email format.');
			return;
		}
		if (password.length < 8) {
			setError('Password is too short. Please include at least 8 characters.');
			return;
		}
		if (password !== confirmPassword) {
			setError('Passwords do not match.');
			return;
		}

		setLoading(true);

		try {
			const result = await signUpWithEmail(email, password);
			console.log('Account created successfully!', result.userId);
		} catch (error: any) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View>
			<Text>Signup Screen</Text>
		</View>
	);
}
