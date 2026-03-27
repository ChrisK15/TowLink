import React, { useState } from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { createCompany } from '@/services/firebase/companies';
import { useAuth } from '@/context/auth-context';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export default function CompanySetupScreen() {
	const { user, refreshRole } = useAuth();
	const router = useRouter();

	const [name, setName] = useState('');
	const [address, setAddress] = useState('');
	const [serviceRadiusKm, setServiceRadiusKm] = useState('');

	const [nameError, setNameError] = useState<string | null>(null);
	const [addressError, setAddressError] = useState<string | null>(null);
	const [radiusError, setRadiusError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	function validate(): boolean {
		let valid = true;
		if (!name.trim()) {
			setNameError('Company name is required.');
			valid = false;
		} else {
			setNameError(null);
		}
		if (!address.trim()) {
			setAddressError('Address is required.');
			valid = false;
		} else {
			setAddressError(null);
		}
		const radius = parseInt(serviceRadiusKm, 10);
		if (isNaN(radius) || radius < 1 || radius > 500) {
			setRadiusError('Enter a radius between 1 and 500 km.');
			valid = false;
		} else {
			setRadiusError(null);
		}
		return valid;
	}

	async function handleSubmit() {
		if (!validate() || !user) return;
		setLoading(true);
		setSubmitError(null);
		try {
			const companyId = await createCompany(
				name.trim(),
				address.trim(),
				parseInt(serviceRadiusKm, 10),
				user.uid,
			);
			// Update admin's user doc with the new companyId
			await updateDoc(doc(db, 'users', user.uid), { companyId });
			// Refresh AuthContext so companyId is immediately available
			await refreshRole();
			// Navigate to the Jobs tab now that setup is complete
			router.replace('/(admin)');
		} catch (e: any) {
			setSubmitError(e.message ?? 'Failed to register company. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<ScrollView
			style={styles.screen}
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled"
		>
			<Text style={styles.title}>Register Your Company</Text>
			<Text style={styles.subtitle}>
				Set up your tow yard to start managing drivers and jobs.
			</Text>

			<View style={styles.formContainer}>
				{/* Company Name */}
				<Text style={styles.label}>Company Name</Text>
				<TextInput
					style={styles.input}
					placeholder="e.g. Downtown Tow & Recovery"
					placeholderTextColor="#999"
					value={name}
					onChangeText={setName}
					returnKeyType="next"
					maxLength={80}
					autoCapitalize="words"
				/>
				{nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

				{/* Address */}
				<Text style={[styles.label, styles.labelSpacing]}>Address</Text>
				<TextInput
					style={styles.input}
					placeholder="123 Main St, City, State ZIP"
					placeholderTextColor="#999"
					value={address}
					onChangeText={setAddress}
					returnKeyType="next"
					autoComplete="street-address"
					autoCapitalize="words"
				/>
				{addressError ? (
					<Text style={styles.fieldError}>{addressError}</Text>
				) : null}
				<Text style={styles.fieldNote}>
					This address sets your company&apos;s location for dispatch routing.
				</Text>

				{/* Service Radius */}
				<Text style={[styles.label, styles.labelSpacing]}>Service Radius (km)</Text>
				<TextInput
					style={styles.input}
					placeholder="25"
					placeholderTextColor="#999"
					value={serviceRadiusKm}
					onChangeText={setServiceRadiusKm}
					keyboardType="numeric"
					returnKeyType="done"
					maxLength={4}
				/>
				{radiusError ? <Text style={styles.fieldError}>{radiusError}</Text> : null}
			</View>

			{submitError ? (
				<Text style={styles.submitError}>{submitError}</Text>
			) : null}

			<TouchableOpacity
				style={[styles.button, loading && styles.buttonDisabled]}
				onPress={handleSubmit}
				disabled={loading}
				activeOpacity={0.8}
			>
				<Text style={styles.buttonText}>Register Company</Text>
			</TouchableOpacity>
			<LoadingOverlay visible={loading} />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#F5F5F5',
	},
	scrollContent: {
		paddingBottom: 40,
	},
	title: {
		fontSize: 22,
		fontWeight: '600',
		color: '#000',
		paddingTop: 24,
		paddingHorizontal: 16,
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		marginTop: 8,
		paddingHorizontal: 16,
	},
	formContainer: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 16,
		marginHorizontal: 16,
		marginTop: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#000',
	},
	labelSpacing: {
		marginTop: 16,
	},
	input: {
		height: 44,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 8,
		paddingHorizontal: 12,
		fontSize: 16,
		backgroundColor: '#FFFFFF',
		marginTop: 6,
	},
	fieldError: {
		fontSize: 12,
		color: '#FF3B30',
		marginTop: 4,
	},
	fieldNote: {
		fontSize: 12,
		color: '#999',
		marginTop: 4,
	},
	submitError: {
		fontSize: 14,
		color: '#FF3B30',
		marginHorizontal: 16,
		marginTop: 16,
		textAlign: 'center',
	},
	button: {
		backgroundColor: '#007AFF',
		borderRadius: 8,
		padding: 16,
		marginTop: 24,
		marginHorizontal: 16,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#FFFFFF',
	},
});
