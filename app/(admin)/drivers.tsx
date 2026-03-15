import React, { useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import BottomSheet, { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '@/context/auth-context';
import { useCompanyDrivers } from '@/hooks/use-company-drivers';
import { addAuthorizedEmail, deactivateDriver } from '@/services/firebase/companies';
import { User } from '@/types/models';

// ─── Avatar helpers ──────────────────────────────────────────────────────────

function getInitials(driver: User): string {
	if (driver.name) {
		const parts = driver.name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return parts[0].slice(0, 2).toUpperCase();
	}
	// Fall back to first 2 chars of email local part
	const localPart = driver.email.split('@')[0];
	return localPart.slice(0, 2).toUpperCase();
}

// ─── Driver Row ──────────────────────────────────────────────────────────────

interface DriverRowProps {
	driver: User;
	onDeactivatePress: (driverId: string) => void;
}

function DriverRow({ driver, onDeactivatePress }: DriverRowProps) {
	const isDeactivated = driver.isActive === false;

	const renderRightActions = () => (
		<TouchableOpacity
			style={styles.swipeAction}
			onPress={() => onDeactivatePress(driver.id)}
			accessibilityLabel="Deactivate driver"
		>
			<Text style={styles.swipeActionText}>Deactivate Driver</Text>
		</TouchableOpacity>
	);

	const rowContent = (
		<View style={[styles.row, isDeactivated && styles.rowDeactivated]}>
			{/* Avatar */}
			<View style={styles.avatar}>
				<Text style={styles.avatarText}>{getInitials(driver)}</Text>
			</View>

			{/* Name + Email */}
			<View style={styles.rowMiddle}>
				<Text style={styles.driverName} numberOfLines={1}>
					{driver.name ?? driver.email}
				</Text>
				{driver.name ? (
					<Text style={styles.driverEmail} numberOfLines={1}>
						{driver.email}
					</Text>
				) : null}
			</View>

			{/* Status chip */}
			<View style={styles.chipContainer}>
				{isDeactivated ? (
					<Text style={styles.chipDeactivated}>Deactivated</Text>
				) : (
					<View style={styles.chipOfflineRow}>
						<View style={styles.chipDot} />
						<Text style={styles.chipOfflineText}>Offline</Text>
					</View>
				)}
			</View>
		</View>
	);

	if (isDeactivated) {
		return <View>{rowContent}</View>;
	}

	return (
		<Swipeable renderRightActions={renderRightActions}>
			{rowContent}
		</Swipeable>
	);
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AdminDriversScreen() {
	const { companyId } = useAuth();
	const { drivers, loading } = useCompanyDrivers(companyId);

	// Bottom sheet state
	const bottomSheetRef = useRef<BottomSheet>(null);
	const snapPoints = ['40%'];

	// Add Driver form state
	const [email, setEmail] = useState('');
	const [emailError, setEmailError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [successVisible, setSuccessVisible] = useState(false);

	// ─── Email validation ──────────────────────────────────────────────────
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const isEmailValid = emailRegex.test(email);

	// ─── Deactivate ────────────────────────────────────────────────────────
	function handleDeactivatePress(driverId: string) {
		Alert.alert(
			'Deactivate Driver',
			'This driver will no longer receive job assignments. You can reactivate them later.',
			[
				{ text: 'Keep Driver', style: 'cancel' },
				{
					text: 'Deactivate Driver',
					style: 'destructive',
					onPress: async () => {
						try {
							await deactivateDriver(driverId);
						} catch (e: any) {
							Alert.alert('Error', e.message);
						}
					},
				},
			],
		);
	}

	// ─── Add Driver ────────────────────────────────────────────────────────
	function handleEmailChange(value: string) {
		setEmail(value);
		if (emailError) setEmailError('');
	}

	async function handleAddDriver() {
		if (!isEmailValid) {
			setEmailError('Enter a valid email address.');
			return;
		}
		if (!companyId) return;

		setSubmitting(true);
		setEmailError('');
		try {
			await addAuthorizedEmail(companyId, email);
			bottomSheetRef.current?.close();
			setEmail('');
			setSuccessVisible(true);
			setTimeout(() => setSuccessVisible(false), 3000);
		} catch (e: any) {
			setEmailError('Failed to add driver. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	// ─── Loading state ─────────────────────────────────────────────────────
	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#007AFF" />
			</View>
		);
	}

	return (
		<View style={styles.screen}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.headerTitle}>Drivers</Text>
				<TouchableOpacity
					style={styles.addButton}
					onPress={() => bottomSheetRef.current?.expand()}
					accessibilityLabel="Add driver"
				>
					<Text style={styles.addButtonText}>+</Text>
				</TouchableOpacity>
			</View>

			{/* Driver list */}
			{drivers.length === 0 ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyHeading}>No drivers yet</Text>
					<Text style={styles.emptyBody}>
						Add a driver using the + button above.
					</Text>
				</View>
			) : (
				<FlatList
					data={drivers}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<DriverRow driver={item} onDeactivatePress={handleDeactivatePress} />
					)}
					style={styles.list}
				/>
			)}

			{/* Success banner */}
			{successVisible && (
				<View style={styles.successBanner}>
					<Text style={styles.successBannerText}>
						Driver added. They can now sign up with this email.
					</Text>
				</View>
			)}

			{/* Add Driver bottom sheet */}
			<BottomSheet
				ref={bottomSheetRef}
				index={-1}
				snapPoints={snapPoints}
				enablePanDownToClose
			>
				<View style={styles.sheetContent}>
					<Text style={styles.sheetHeading}>Add Driver</Text>

					<BottomSheetTextInput
						style={styles.input}
						placeholder="driver@yourcompany.com"
						value={email}
						onChangeText={handleEmailChange}
						autoCapitalize="none"
						keyboardType="email-address"
						autoComplete="email"
					/>

					{emailError ? (
						<Text style={styles.inputError}>{emailError}</Text>
					) : null}

					<TouchableOpacity
						style={[
							styles.addDriverButton,
							(!isEmailValid || submitting) && styles.addDriverButtonDisabled,
						]}
						onPress={handleAddDriver}
						disabled={!isEmailValid || submitting}
					>
						{submitting ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text style={styles.addDriverButtonText}>Add Driver</Text>
						)}
					</TouchableOpacity>
				</View>
			</BottomSheet>
		</View>
	);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: '#F5F5F5',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},

	// Header
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: 16,
		backgroundColor: '#F5F5F5',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000',
	},
	addButton: {
		width: 44,
		height: 44,
		justifyContent: 'center',
		alignItems: 'center',
	},
	addButtonText: {
		fontSize: 28,
		color: '#007AFF',
		lineHeight: 32,
	},

	// List
	list: {
		flex: 1,
	},

	// Driver row
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 12,
		minHeight: 64,
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
	},
	rowDeactivated: {
		opacity: 0.5,
	},

	// Avatar
	avatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#E0E0E0',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	avatarText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#666',
	},

	// Row middle
	rowMiddle: {
		flex: 1,
		marginRight: 8,
	},
	driverName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#000',
	},
	driverEmail: {
		fontSize: 12,
		color: '#999',
		marginTop: 2,
	},

	// Status chips
	chipContainer: {
		alignItems: 'flex-end',
	},
	chipOfflineRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	chipDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: '#8E8E93',
	},
	chipOfflineText: {
		fontSize: 14,
		color: '#8E8E93',
	},
	chipDeactivated: {
		fontSize: 14,
		color: '#666666',
	},

	// Swipe action
	swipeAction: {
		backgroundColor: '#FF3B30',
		justifyContent: 'center',
		paddingHorizontal: 20,
		minHeight: 64,
	},
	swipeActionText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 16,
	},

	// Empty state
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	emptyHeading: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000',
		marginBottom: 8,
	},
	emptyBody: {
		fontSize: 14,
		color: '#666666',
		textAlign: 'center',
	},

	// Success banner
	successBanner: {
		position: 'absolute',
		bottom: 80,
		left: 16,
		right: 16,
		backgroundColor: '#34C759',
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 16,
	},
	successBannerText: {
		fontSize: 14,
		color: '#FFFFFF',
	},

	// Bottom sheet
	sheetContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	sheetHeading: {
		fontSize: 20,
		fontWeight: '600',
		color: '#000',
		marginBottom: 16,
	},
	input: {
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		backgroundColor: '#FFFFFF',
		marginBottom: 4,
	},
	inputError: {
		fontSize: 14,
		color: '#FF3B30',
		marginBottom: 8,
		marginTop: 4,
	},
	addDriverButton: {
		backgroundColor: '#007AFF',
		borderRadius: 8,
		padding: 14,
		alignItems: 'center',
		marginTop: 12,
	},
	addDriverButtonDisabled: {
		opacity: 0.6,
	},
	addDriverButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#FFFFFF',
	},
});
