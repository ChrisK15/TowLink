import { signUpWithEmail } from '@/services/firebase/authService';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

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
		<View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
			<Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
				Create Account
			</Text>
			<TextInput
				placeholder="Email"
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoCapitalize="none"
				style={{
					borderWidth: 1,
					padding: 10,
					marginBottom: 10,
					borderRadius: 5,
				}}
			/>
			<TextInput
				placeholder="Password"
				value={password}
				onChangeText={setPassword}
				autoCapitalize="none"
				secureTextEntry={true}
				style={{
					borderWidth: 1,
					padding: 10,
					marginBottom: 10,
					borderRadius: 5,
				}}
			/>
			<TextInput
				placeholder="Confirm Password"
				value={confirmPassword}
				onChangeText={setConfirmPassword}
				autoCapitalize="none"
				secureTextEntry={true}
				style={{
					borderWidth: 1,
					padding: 10,
					marginBottom: 10,
					borderRadius: 5,
				}}
			/>
			{error ? (
				<Text style={{ color: 'red', marginBottom: 10, textAlign: 'center' }}>
					{error}
				</Text>
			) : null}
			<Pressable
				onPress={handleSignup}
				disabled={loading}
				style={{
					backgroundColor: loading ? '#ccc' : '#0a7ea4',
					padding: 15,
					borderRadius: 8,
					alignItems: 'center',
				}}
			>
				<Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>
					{loading ? 'Creating Account...' : 'Sign Up'}
				</Text>
			</Pressable>
		</View>
	);
}
