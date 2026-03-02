import { useAuth } from '@/context/auth-context';
import { updateUserProfile } from '@/services/firebase/authService';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function validateProfileForm(name: string, phone: string): string | null {
	if (!name.trim() || !phone.trim()) {
		return 'Please fill in all fields.';
	}
	if (name.trim().length < 2) {
		return 'Please enter your full name.';
	}
	const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
	if (!phoneRegex.test(phone.trim())) {
		return 'Please enter a valid phone number.';
	}
	return null;
}

export default function CommuterSetupScreen() {
	const { user, refreshRole } = useAuth();

	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [isSaved, setIsSaved] = useState(false);

	const handleSave = async () => {
		const validationError = validateProfileForm(name, phone);
		if (validationError) {
			setError(validationError);
			return;
		}

		if (!user) {
			setError('Session expired. Please sign in again.');
			return;
		}

		setLoading(true);
		setError('');
		try {
			await updateUserProfile(user.uid, {
				name: name.trim(),
				phone: phone.trim(),
			});
			setIsSaved(true);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleContinue = async () => {
		await refreshRole();
	};

	useEffect(() => {
		if (!isSaved) return;
		const timer = setTimeout(() => {
			handleContinue();
		}, 3000);
		return () => clearTimeout(timer);
	}, [isSaved]);

	if (isSaved) {
		return (
			<SafeAreaView style={styles.container}>
				<ScrollView
					contentContainerStyle={styles.successContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.successIconCircle}>
						<Ionicons name="checkmark-circle" size={64} color="#22C55E" />
					</View>

					<Text style={styles.successHeading}>Welcome to TowLink!</Text>
					<Text style={styles.successSubtitle}>
						Your account has been created successfully
					</Text>

					<View style={styles.card}>
						<View style={styles.bulletRow}>
							<View style={styles.bulletIconCircle}>
								<Ionicons name="checkmark" size={16} color="#6B7280" />
							</View>
							<View style={styles.bulletText}>
								<Text style={styles.bulletTitle}>Account Verified</Text>
								<Text style={styles.bulletDescription}>
									Your email has been verified and your account is ready
								</Text>
							</View>
						</View>

						<View style={styles.bulletRow}>
							<View style={styles.bulletIconCircle}>
								<Text style={styles.bulletEmoji}>🚗</Text>
							</View>
							<View style={styles.bulletText}>
								<Text style={styles.bulletTitle}>
									Request Assistance Anytime
								</Text>
								<Text style={styles.bulletDescription}>
									Get help whenever and{' '}
									<Text style={styles.highlightText}>wherever</Text>
									{' '}you need it
								</Text>
							</View>
						</View>

						<View style={[styles.bulletRow, styles.bulletRowLast]}>
							<View style={styles.bulletIconCircle}>
								<Text style={styles.bulletEmoji}>⚡</Text>
							</View>
							<View style={styles.bulletText}>
								<Text style={styles.bulletTitle}>Fast Response Times</Text>
								<Text style={styles.bulletDescription}>
									Get connected to nearby drivers{' '}
									<Text style={styles.highlightText}>in seconds</Text>
								</Text>
							</View>
						</View>
					</View>

					<Pressable style={styles.button} onPress={handleContinue}>
						<Text style={styles.buttonText}>Continue to App</Text>
					</Pressable>

					<Text style={styles.redirectText}>
						Automatically redirecting in 3 seconds...
					</Text>
				</ScrollView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.formContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.iconCircle}>
					<Text style={styles.iconEmoji}>🚗</Text>
				</View>

				<Text style={styles.heading}>Join TowLink</Text>
				<Text style={styles.subtitle}>
					Get roadside assistance when you need{' '}
					<Text style={styles.highlightText}>it</Text>
				</Text>

				<View style={styles.formGroup}>
					<Text style={styles.label}>Full Name</Text>
					<TextInput
						style={styles.input}
						placeholder="John Doe"
						placeholderTextColor="#9CA3AF"
						value={name}
						onChangeText={(text) => {
							setName(text);
							setError('');
						}}
						autoCapitalize="words"
						autoCorrect={false}
					/>
				</View>

				<View style={styles.formGroup}>
					<Text style={styles.label}>Phone Number</Text>
					<TextInput
						style={styles.input}
						placeholder="+1 (555) 123-4567"
						placeholderTextColor="#9CA3AF"
						value={phone}
						onChangeText={(text) => {
							setPhone(text);
							setError('');
						}}
						keyboardType="phone-pad"
					/>
				</View>

				{error ? <Text style={styles.errorText}>{error}</Text> : null}

				<Pressable
					style={[styles.button, loading && styles.buttonDisabled]}
					onPress={handleSave}
					disabled={loading}
				>
					<Text style={styles.buttonText}>
						{loading ? 'Saving...' : 'Create Account'}
					</Text>
				</Pressable>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	formContent: {
		paddingHorizontal: 24,
		paddingTop: 32,
		paddingBottom: 40,
		alignItems: 'center',
	},
	successContent: {
		paddingHorizontal: 24,
		paddingTop: 32,
		paddingBottom: 40,
		alignItems: 'center',
	},
	// ── Form screen ────────────────────────────────────────────────
	iconCircle: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#EBF4FD',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20,
	},
	iconEmoji: {
		fontSize: 32,
	},
	heading: {
		fontSize: 26,
		fontWeight: 'bold',
		color: '#1A1A2E',
		textAlign: 'center',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 15,
		color: '#6B7280',
		textAlign: 'center',
		marginBottom: 32,
	},
	highlightText: {
		color: '#2B7AFF',
	},
	formGroup: {
		width: '100%',
		marginBottom: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1A1A2E',
		marginBottom: 8,
	},
	input: {
		width: '100%',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 30,
		paddingVertical: 14,
		paddingHorizontal: 18,
		fontSize: 15,
		color: '#1A1A2E',
		backgroundColor: '#FFFFFF',
	},
	errorText: {
		color: '#EF4444',
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 12,
		alignSelf: 'stretch',
	},
	button: {
		width: '100%',
		backgroundColor: '#2B7AFF',
		borderRadius: 50,
		paddingVertical: 16,
		alignItems: 'center',
		marginTop: 8,
	},
	buttonDisabled: {
		backgroundColor: '#A0BEFF',
	},
	buttonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
	// ── Success screen ─────────────────────────────────────────────
	successIconCircle: {
		width: 96,
		height: 96,
		borderRadius: 48,
		backgroundColor: '#DCFCE7',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24,
	},
	successHeading: {
		fontSize: 26,
		fontWeight: 'bold',
		color: '#1A1A2E',
		textAlign: 'center',
		marginBottom: 8,
	},
	successSubtitle: {
		fontSize: 15,
		color: '#6B7280',
		textAlign: 'center',
		marginBottom: 28,
	},
	card: {
		width: '100%',
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 20,
		borderWidth: 1,
		borderColor: '#E5E7EB',
		marginBottom: 24,
	},
	bulletRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingBottom: 16,
		marginBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	bulletRowLast: {
		borderBottomWidth: 0,
		marginBottom: 0,
		paddingBottom: 0,
	},
	bulletIconCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#F3F4F6',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 14,
		flexShrink: 0,
	},
	bulletEmoji: {
		fontSize: 16,
	},
	bulletText: {
		flex: 1,
	},
	bulletTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1A1A2E',
		marginBottom: 2,
	},
	bulletDescription: {
		fontSize: 13,
		color: '#6B7280',
		lineHeight: 18,
	},
	redirectText: {
		fontSize: 13,
		color: '#9CA3AF',
		marginTop: 4,
		textAlign: 'center',
	},
});
