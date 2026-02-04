import { signUpWithEmail } from '@/services/firebase/authService';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

function validateSignupForm(
	email: string,
	password: string,
	confirmPassword: string,
): string | null {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!email || !password || !confirmPassword) {
		return 'All fields are required.';
	}
	if (!emailRegex.test(email)) {
		return 'Please enter a valid email address';
	}
	if (password.length < 8) {
		return 'Password is too short. Please include at least 8 characters.';
	}
	if (password !== confirmPassword) {
		return 'Passwords do not match.';
	}
	return null;
}

export default function SignupScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSignup = async () => {
		const validationError = validateSignupForm(
			email,
			password,
			confirmPassword,
		);
		if (validationError) {
			setError(validationError);
			return;
		}

		setLoading(true);

		try {
			const result = await signUpWithEmail(email, password);
			console.log('Account created successfully!', result.userId);
			router.replace('/role-selection');
		} catch (error: any) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Create Account</Text>
			<TextInput
				placeholder="Email"
				placeholderTextColor="#888"
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoCapitalize="none"
				style={styles.input}
			/>
			<TextInput
				placeholder="Password"
				placeholderTextColor="#888"
				value={password}
				onChangeText={setPassword}
				autoCapitalize="none"
				secureTextEntry={true}
				style={styles.input}
			/>
			<TextInput
				placeholder="Confirm Password"
				placeholderTextColor="#888"
				value={confirmPassword}
				onChangeText={setConfirmPassword}
				autoCapitalize="none"
				secureTextEntry={true}
				style={styles.input}
			/>
			{error ? <Text style={styles.errorText}>{error}</Text> : null}
			<Pressable
				onPress={handleSignup}
				disabled={loading}
				style={[styles.button, loading ? styles.buttonDisabled : null]}
			>
				<Text style={styles.buttonText}>
					{loading ? 'Creating Account...' : 'Sign Up'}
				</Text>
			</Pressable>
			<Pressable
				onPress={() => {
					router.replace('/login');
				}}
				style={styles.loginLink}
			>
				<Text style={styles.loginLinkText}>Already have an account? Login</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#fff',
	},
	input: {
		borderWidth: 1,
		padding: 10,
		marginBottom: 10,
		borderRadius: 5,
		backgroundColor: '#fff',
	},
	errorText: {
		color: 'red',
		marginBottom: 10,
		textAlign: 'center',
	},
	button: {
		backgroundColor: '#0a7ea4',
		padding: 15,
		borderRadius: 8,
		alignItems: 'center',
	},
	buttonDisabled: {
		backgroundColor: '#ccc',
	},
	buttonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '600',
	},
	loginLink: {
		marginTop: 20,
	},
	loginLinkText: {
		color: '#0a7ea4',
	},
});
