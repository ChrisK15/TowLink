import { useAuth } from '@/context/auth-context';
import {
	signUpWithEmail,
	updateUserProfile,
	updateUserRole,
} from '@/services/firebase/authService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function validateCreateAccountForm(
	name: string,
	email: string,
	phone: string,
	password: string,
	confirmPassword: string,
	termsAccepted: boolean,
): string | null {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
	if (!name.trim() || !email.trim() || !phone.trim() || !password || !confirmPassword) {
		return 'All fields are required.';
	}
	if (name.trim().length < 2) return 'Please enter your full name.';
	if (!emailRegex.test(email.trim())) return 'Please enter a valid email address.';
	if (!phoneRegex.test(phone.trim())) return 'Please enter a valid phone number.';
	if (password.length < 8) return 'Password must be at least 8 characters.';
	if (password !== confirmPassword) return 'Passwords do not match.';
	if (!termsAccepted) return 'Please accept the Terms of Service to continue.';
	return null;
}

export default function CommuterSetupScreen() {
	const { refreshRole } = useAuth();
	const router = useRouter();

	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [isSaved, setIsSaved] = useState(false);

	const clearError = () => setError('');

	const handleCreateAccount = async () => {
		const validationError = validateCreateAccountForm(
			name, email, phone, password, confirmPassword, termsAccepted,
		);
		if (validationError) {
			setError(validationError);
			return;
		}
		setLoading(true);
		setError('');
		try {
			const { userId } = await signUpWithEmail(email, password);
			await updateUserRole(userId, 'commuter');
			await updateUserProfile(userId, { name: name.trim(), phone: phone.trim() });
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

	// ── Success state ──────────────────────────────────────────────
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

	// ── Form state ─────────────────────────────────────────────────
	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Pressable onPress={() => router.back()} style={styles.headerBack}>
					<Ionicons name="arrow-back" size={22} color="#1A1A2E" />
				</Pressable>
				<Text style={styles.headerTitle}>Create Account</Text>
				<View style={styles.headerRight}>
					<Ionicons name="moon-outline" size={22} color="#1A1A2E" />
				</View>
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView
					contentContainerStyle={styles.formContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Icon */}
					<View style={styles.iconCircle}>
						<Text style={styles.iconEmoji}>🚗</Text>
					</View>

					<Text style={styles.heading}>Join TowLink</Text>
					<Text style={styles.subtitle}>
						Get roadside assistance when you need{' '}
						<Text style={styles.highlightText}>it</Text>
					</Text>

					{/* Full Name */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Full Name</Text>
						<TextInput
							style={styles.input}
							placeholder="John Doe"
							placeholderTextColor="#9CA3AF"
							value={name}
							onChangeText={(t) => { setName(t); clearError(); }}
							autoCapitalize="words"
							autoCorrect={false}
						/>
					</View>

					{/* Email */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Email Address</Text>
						<TextInput
							style={styles.input}
							placeholder="you@example.com"
							placeholderTextColor="#9CA3AF"
							value={email}
							onChangeText={(t) => { setEmail(t); clearError(); }}
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
						/>
					</View>

					{/* Phone */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Phone Number</Text>
						<TextInput
							style={styles.input}
							placeholder="+1 (555) 123-4567"
							placeholderTextColor="#9CA3AF"
							value={phone}
							onChangeText={(t) => { setPhone(t); clearError(); }}
							keyboardType="phone-pad"
						/>
					</View>

					{/* Password */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Password</Text>
						<View style={styles.passwordContainer}>
							<TextInput
								style={styles.passwordInput}
								placeholder="••••••••"
								placeholderTextColor="#9CA3AF"
								value={password}
								onChangeText={(t) => { setPassword(t); clearError(); }}
								secureTextEntry={!showPassword}
								autoCapitalize="none"
							/>
							<Pressable
								onPress={() => setShowPassword(!showPassword)}
								style={styles.eyeButton}
							>
								<Ionicons
									name={showPassword ? 'eye-off-outline' : 'eye-outline'}
									size={20}
									color="#9CA3AF"
								/>
							</Pressable>
						</View>
					</View>

					{/* Confirm Password */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Confirm Password</Text>
						<View style={styles.passwordContainer}>
							<TextInput
								style={styles.passwordInput}
								placeholder="••••••••"
								placeholderTextColor="#9CA3AF"
								value={confirmPassword}
								onChangeText={(t) => { setConfirmPassword(t); clearError(); }}
								secureTextEntry={!showConfirmPassword}
								autoCapitalize="none"
							/>
							<Pressable
								onPress={() => setShowConfirmPassword(!showConfirmPassword)}
								style={styles.eyeButton}
							>
								<Ionicons
									name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
									size={20}
									color="#9CA3AF"
								/>
							</Pressable>
						</View>
					</View>

					{/* Terms */}
					<Pressable
						style={styles.termsRow}
						onPress={() => setTermsAccepted(!termsAccepted)}
					>
						<View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
							{termsAccepted && (
								<Ionicons name="checkmark" size={12} color="#FFFFFF" />
							)}
						</View>
						<Text style={styles.termsText}>
							I agree to the{' '}
							<Text style={styles.termsLink}>Terms of Service</Text>
							{' '}and{' '}
							<Text style={styles.termsLink}>Privacy Policy</Text>
						</Text>
					</Pressable>

					{error ? <Text style={styles.errorText}>{error}</Text> : null}

					<Pressable
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={handleCreateAccount}
						disabled={loading}
					>
						<Text style={styles.buttonText}>
							{loading ? 'Creating Account...' : 'Create Account'}
						</Text>
					</Pressable>

					{/* Sign in link */}
					<View style={styles.signInRow}>
						<Text style={styles.signInText}>Already have an account? </Text>
						<Pressable onPress={() => router.back()}>
							<Text style={styles.signInLink}>Sign In</Text>
						</Pressable>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	// ── Header ─────────────────────────────────────────────────────
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#F3F4F6',
	},
	headerBack: {
		width: 36,
		height: 36,
		justifyContent: 'center',
		alignItems: 'flex-start',
	},
	headerTitle: {
		flex: 1,
		textAlign: 'center',
		fontSize: 17,
		fontWeight: '600',
		color: '#1A1A2E',
	},
	headerRight: {
		width: 36,
		height: 36,
		justifyContent: 'center',
		alignItems: 'flex-end',
	},
	// ── Form screen ────────────────────────────────────────────────
	formContent: {
		paddingHorizontal: 24,
		paddingTop: 32,
		paddingBottom: 40,
		alignItems: 'center',
	},
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
	passwordContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 30,
		backgroundColor: '#FFFFFF',
	},
	passwordInput: {
		flex: 1,
		paddingVertical: 14,
		paddingHorizontal: 18,
		fontSize: 15,
		color: '#1A1A2E',
	},
	eyeButton: {
		paddingRight: 16,
		paddingVertical: 14,
	},
	termsRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		width: '100%',
		marginBottom: 20,
		marginTop: 4,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 1.5,
		borderColor: '#D1D5DB',
		marginRight: 10,
		marginTop: 1,
		justifyContent: 'center',
		alignItems: 'center',
		flexShrink: 0,
	},
	checkboxChecked: {
		backgroundColor: '#2B7AFF',
		borderColor: '#2B7AFF',
	},
	termsText: {
		flex: 1,
		fontSize: 13,
		color: '#6B7280',
		lineHeight: 20,
	},
	termsLink: {
		color: '#2B7AFF',
		fontWeight: '600',
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
	signInRow: {
		flexDirection: 'row',
		marginTop: 24,
		alignItems: 'center',
	},
	signInText: {
		fontSize: 14,
		color: '#6B7280',
	},
	signInLink: {
		fontSize: 14,
		color: '#2B7AFF',
		fontWeight: '600',
	},
	// ── Success screen ─────────────────────────────────────────────
	successContent: {
		paddingHorizontal: 24,
		paddingTop: 32,
		paddingBottom: 40,
		alignItems: 'center',
	},
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
