import { updateUserRole } from '@/services/firebase/authService';
import { auth } from '@/services/firebase/config';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function RoleSelectionScreen() {
	const [selectedRole, setSelectedRole] = useState<
		'commuter' | 'driver' | null
	>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const handleContinue = async () => {
		if (!selectedRole) {
			setError('Please select a role.');
			return;
		}

		const currentUser = auth.currentUser;
		if (!currentUser) {
			setError('Session expired. Please sign up again.');
			return;
		}

		setLoading(true);
		try {
			await updateUserRole(currentUser.uid, selectedRole);
			console.log('Role saved successfully!', selectedRole);
			router.replace('/(tabs)');
		} catch (error: any) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>How will you use TowLink?</Text>
			<Pressable
				style={[
					styles.card,
					selectedRole === 'commuter' && styles.cardSelected,
				]}
				onPress={() => {
					setSelectedRole('commuter');
					setError('');
				}}
				disabled={loading}
			>
				<Text style={styles.cardIcon}>👤</Text>
				<Text style={styles.cardTitle}>Commuter</Text>
				<Text style={styles.cardDescription}>I need a tow service</Text>
			</Pressable>
			<Pressable
				style={[styles.card, selectedRole === 'driver' && styles.cardSelected]}
				onPress={() => {
					setSelectedRole('driver');
					setError('');
				}}
				disabled={loading}
			>
				<Text style={styles.cardIcon}>🚛</Text>
				<Text style={styles.cardTitle}>Driver</Text>
				<Text style={styles.cardDescription}>I offer tow services</Text>
			</Pressable>
			{error ? <Text style={styles.errorText}>{error}</Text> : null}
			<Pressable
				style={[
					styles.button,
					selectedRole === null || loading
						? styles.buttonDisabled
						: styles.buttonEnabled,
				]}
				disabled={selectedRole === null || loading}
				onPress={handleContinue}
			>
				<Text style={styles.buttonText}>
					{loading ? 'Saving...' : 'Continue'}
				</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 32,
	},
	card: {
		padding: 20,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#e0e0e0',
		marginBottom: 16,
		alignItems: 'center',
	},
	cardSelected: {
		borderColor: '#007AFF',
		backgroundColor: '#f0f8ff',
	},
	cardIcon: {
		fontSize: 40,
		marginBottom: 8,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '600',
	},
	cardDescription: {
		fontSize: 14,
		color: '#666',
		marginTop: 4,
	},
	button: {
		padding: 16,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 24,
	},
	buttonEnabled: {
		backgroundColor: '#007AFF',
	},
	buttonDisabled: {
		backgroundColor: '#ccc',
	},
	buttonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '600',
	},
	errorText: {
		color: 'red',
		textAlign: 'center',
		marginTop: 16,
	},
});
