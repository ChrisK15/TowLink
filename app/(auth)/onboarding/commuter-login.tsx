import { signInWithEmail } from '@/services/firebase/authService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

function validateLoginForm(email: string, password: string): string | null {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!email || !password) return 'All fields are required.';
	if (!emailRegex.test(email)) return 'Please enter a valid email address.';
	return null;
}

export default function CommuterLoginScreen() {
	const router = useRouter();

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSignIn = async () => {
		const validationError = validateLoginForm(email, password);
		if (validationError) {
			setError(validationError);
			return;
		}
		setLoading(true);
		setError('');
		try {
			await signInWithEmail(email, password);
			// _layout.tsx handles redirect based on role after auth state updates
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Pressable onPress={() => router.replace('/(auth)/onboarding/role-selection' as any)} style={styles.headerBack}>
					<Ionicons name="arrow-back" size={22} color="#1A1A2E" />
				</Pressable>
				<Text style={styles.headerTitle}>Commuter Login</Text>
				<View style={styles.headerRight}>
					<Ionicons name="moon-outline" size={22} color="#1A1A2E" />
				</View>
			</View>

			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView
					contentContainerStyle={styles.content}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Icon */}
					<View style={styles.iconCircle}>
						<Text style={styles.iconEmoji}>🚗</Text>
					</View>

					{/* Heading */}
					<Text style={styles.heading}>Welcome Back</Text>
					<Text style={styles.subtitle}>
						Sign in to request roadside assistance
					</Text>

					{/* Social buttons */}
					<Pressable style={styles.socialButton}>
						<Ionicons
							name="logo-google"
							size={20}
							color="#4285F4"
							style={styles.socialIcon}
						/>
						<Text style={styles.socialButtonText}>Continue with Google</Text>
					</Pressable>

					<Pressable style={styles.socialButton}>
						<Ionicons
							name="logo-apple"
							size={20}
							color="#1A1A2E"
							style={styles.socialIcon}
						/>
						<Text style={styles.socialButtonText}>Continue with Apple</Text>
					</Pressable>

					{/* OR divider */}
					<View style={styles.dividerRow}>
						<View style={styles.dividerLine} />
						<Text style={styles.dividerText}>OR</Text>
						<View style={styles.dividerLine} />
					</View>

					{/* Email field */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Email Address</Text>
						<TextInput
							testID="commuter-email-input"
							style={styles.input}
							placeholder="you@example.com"
							placeholderTextColor="#9CA3AF"
							value={email}
							onChangeText={(t) => {
								setEmail(t);
								setError('');
							}}
							keyboardType="email-address"
							autoCapitalize="none"
							autoCorrect={false}
						/>
					</View>

					{/* Password field */}
					<View style={styles.formGroup}>
						<Text style={styles.label}>Password</Text>
						<View style={styles.passwordContainer}>
							<TextInput
								testID="commuter-password-input"
								style={styles.passwordInput}
								placeholder="••••••••"
								placeholderTextColor="#9CA3AF"
								value={password}
								onChangeText={(t) => {
									setPassword(t);
									setError('');
								}}
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

					{/* Forgot password */}
					<Pressable style={styles.forgotRow}>
						<Text style={styles.forgotText}>Forgot password?</Text>
					</Pressable>

					{/* Error */}
					{error ? <Text style={styles.errorText}>{error}</Text> : null}

					{/* Sign In button */}
					<Pressable
						testID="commuter-sign-in-btn"
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={handleSignIn}
						disabled={loading}
					>
						<Text style={styles.buttonText}>
							{loading ? 'Signing in...' : 'Sign In'}
						</Text>
					</Pressable>

					{/* Create account link */}
					<View style={styles.createAccountRow}>
						<Text style={styles.createAccountText}>
							Don't have an account?{' '}
						</Text>
						<Pressable
							onPress={() => router.push('/(auth)/commuter-setup' as any)}
						>
							<Text style={styles.createAccountLink}>Create Account</Text>
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
	// ── Content ────────────────────────────────────────────────────
	content: {
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
		marginBottom: 28,
	},
	// ── Social buttons ─────────────────────────────────────────────
	socialButton: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 30,
		paddingVertical: 14,
		marginBottom: 12,
		backgroundColor: '#FFFFFF',
	},
	socialIcon: {
		marginRight: 10,
	},
	socialButtonText: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1A1A2E',
	},
	// ── OR divider ─────────────────────────────────────────────────
	dividerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		marginVertical: 20,
	},
	dividerLine: {
		flex: 1,
		height: 1,
		backgroundColor: '#E5E7EB',
	},
	dividerText: {
		marginHorizontal: 12,
		fontSize: 13,
		color: '#9CA3AF',
		fontWeight: '500',
	},
	// ── Form ───────────────────────────────────────────────────────
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
	forgotRow: {
		width: '100%',
		alignItems: 'flex-end',
		marginTop: -4,
		marginBottom: 8,
	},
	forgotText: {
		fontSize: 14,
		color: '#2B7AFF',
		fontWeight: '500',
	},
	errorText: {
		color: '#EF4444',
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 12,
		alignSelf: 'stretch',
	},
	// ── CTA ────────────────────────────────────────────────────────
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
	createAccountRow: {
		flexDirection: 'row',
		marginTop: 24,
		alignItems: 'center',
	},
	createAccountText: {
		fontSize: 14,
		color: '#6B7280',
	},
	createAccountLink: {
		fontSize: 14,
		color: '#2B7AFF',
		fontWeight: '600',
	},
});
