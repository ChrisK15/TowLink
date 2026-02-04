import { signInWithEmail } from '@/services/firebase/authService';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');

	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	function validateLoginForm(email: string, password: string): string | null {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!email || !password) {
			return 'All fields are required.';
		}
		if (!emailRegex.test(email)) {
			return 'Please enter a valid email address';
		}
		return null;
	}

	const handleLogin = async () => {
		const validationError = validateLoginForm(email, password);
		if (validationError) {
			setError(validationError);
			return;
		}

		setLoading(true);

		try {
			const result = await signInWithEmail(email, password);
			if (result.role === 'commuter' || result.role === 'driver') {
				router.replace('/(tabs)');
			} else {
				router.replace('/role-selection');
			}
		} catch (error: any) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.view}>
			<Text style={styles.title}>Login</Text>
			<TextInput
				placeholder="Email"
				placeholderTextColor="#888"
				value={email}
				onChangeText={setEmail}
				keyboardType="email-address"
				autoCapitalize="none"
				style={styles.placeholder}
			/>
			<TextInput
				placeholder="Password"
				placeholderTextColor="#888"
				value={password}
				onChangeText={setPassword}
				autoCapitalize="none"
				secureTextEntry={true}
				style={styles.placeholder}
			/>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			<Pressable
				onPress={handleLogin}
				disabled={loading}
				style={[
					styles.loginButton,
					{ backgroundColor: loading ? '#ccc' : '#0a7ea4' },
				]}
			>
				<Text style={styles.loginButtonText}>
					{loading ? 'Logging in...' : 'Login'}
				</Text>
			</Pressable>
			<Pressable
				onPress={() => {
					router.replace('/signup');
				}}
				style={styles.signUpLink}
			>
				<Text style={styles.signUpLinkText}>
					Don't have an account? Sign Up
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	view: {
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
	placeholder: {
		borderWidth: 1,
		padding: 10,
		marginBottom: 10,
		borderRadius: 5,
		backgroundColor: '#fff',
	},
	error: {
		color: 'red',
		marginBottom: 10,
		textAlign: 'center',
	},
	loginButton: {
		padding: 15,
		borderRadius: 8,
		alignItems: 'center',
	},
	loginButtonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '600',
	},
	signUpLink: {
		marginTop: 20,
	},
	signUpLinkText: {
		color: '#0a7ea4',
	},
});
