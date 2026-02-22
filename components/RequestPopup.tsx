import { Request } from '@/types/models';
import { useEffect, useRef, useState } from 'react';
import {
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

interface RequestPopupProps {
	request?: Request;
	visible: boolean;
	isLoading?: boolean;
	onAccept: () => void;
	onDecline: () => void;
}

export function RequestPopup({
	request,
	visible,
	isLoading,
	onAccept,
	onDecline,
}: RequestPopupProps) {
	const [timeLeft, setTimeLeft] = useState(30);
	const initialTimeRef = useRef<number | null>(null);

	// Timer countdown
	useEffect(() => {
		if (!visible || !request?.claimExpiresAt) {
			setTimeLeft(30);
			return;
		}
		const startingSeconds = Math.floor(
			(request.claimExpiresAt.getTime() - Date.now()) / 1000,
		);
		initialTimeRef.current = startingSeconds;
		setTimeLeft(startingSeconds);

		const interval = setInterval(() => {
			const secondsLeft = Math.floor(
				(request.claimExpiresAt!.getTime() - Date.now()) / 1000,
			);
			setTimeLeft(secondsLeft);

			if (secondsLeft <= 0) {
				clearInterval(interval);
				onDecline();
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [visible, request, onDecline]);

	if (!request) return null;

	// Get initials from commuter name
	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	// Progress bar percentage and color
	const progress = (timeLeft / (initialTimeRef.current ?? 30)) * 100;
	const isExpiringSoon = timeLeft <= 5;
	const progressColor = isExpiringSoon ? '#FF3B30' : '#007AFF';
	const timerColor = isExpiringSoon ? '#FF3B30' : '#007AFF';

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onDecline}
		>
			<View style={styles.container}>
				<ScrollView style={styles.scrollView}>
					{/* Header */}
					<View style={styles.header}>
						<Text style={styles.title}>New Request</Text>
						<Text style={[styles.timer, { color: timerColor }]}>
							⏱️ {timeLeft}s
						</Text>
						<Text style={styles.subtitle}>
							{isExpiringSoon
								? 'Request expiring soon!'
								: 'Auto-rejects in 30 seconds'}
						</Text>

						{/* Progress Bar */}
						<View style={styles.progressBarContainer}>
							<View
								style={[
									styles.progressBar,
									{ width: `${progress}%`, backgroundColor: progressColor },
								]}
							/>
						</View>
					</View>

					{/* Commuter Info */}
					<View style={[styles.card, styles.cardRow]}>
						<View style={styles.initialsCircle}>
							<Text style={styles.initialsText}>
								{getInitials(request.commuterName || 'Unknown')}
							</Text>
						</View>
						<View style={styles.commuterInfo}>
							<Text style={styles.commuterName}>
								{request.commuterName || 'Unknown'}
							</Text>
						</View>
					</View>

					{/* Pickup Location */}
					<View style={[styles.card, styles.cardRow]}>
						<View style={styles.iconCircle}>
							<Text style={styles.iconText}>📍</Text>
						</View>
						<View style={styles.locationInfo}>
							<Text style={styles.locationLabel}>Pickup Location</Text>
							<Text style={styles.address}>{request.pickupAddress}</Text>
							<Text style={styles.distance}>
								{request.estimatedPickupDistance
									? `${request.estimatedPickupDistance} miles away`
									: 'Distance Calculating...'}
							</Text>
						</View>
					</View>

					{/* Drop-off Location */}
					<View style={[styles.card, styles.cardRow]}>
						<View style={[styles.iconCircle, { backgroundColor: '#FFE5E5' }]}>
							<Text style={styles.iconText}>🚗</Text>
						</View>
						<View style={styles.locationInfo}>
							<Text style={styles.locationLabel}>Drop-off Location</Text>
							<Text style={styles.address}>{request.dropoffAddress}</Text>
							<Text style={styles.distance}>
								{request.totalTripDistance
									? `${request.totalTripDistance} total trip`
									: 'Distance Calculating...'}
							</Text>
						</View>
					</View>

					{/* Service Type & Fare */}
					<View style={[styles.card, styles.serviceCard]}>
						<View style={styles.serviceTypeContainer}>
							<Text style={styles.serviceLabel}>Service Type</Text>
							<Text style={styles.serviceType}>🚚 Towing</Text>
						</View>
						<View style={styles.fareContainer}>
							<Text style={styles.fareLabel}>Estimated Fare</Text>
							<Text style={styles.fare}>
								{request.estimatedPrice
									? `$${request.estimatedPrice}`
									: 'Price Calculating...'}
							</Text>
						</View>
					</View>

					{/* Vehicle Details */}
					{request.vehicleInfo && (
						<View style={styles.card}>
							<View style={styles.sectionContent}>
								<Text style={styles.sectionLabel}>Vehicle Details</Text>
								<Text style={styles.vehicleText}>
									{request.vehicleInfo.year} {request.vehicleInfo.make}{' '}
									{request.vehicleInfo.model}
								</Text>
							</View>
						</View>
					)}

					{/* Customer Notes */}
					<View style={styles.card}>
						<View style={styles.sectionContent}>
							<Text style={styles.sectionLabel}>Customer Notes</Text>
							<Text style={styles.notesText}>
								{request.customerNotes
									? `${request.customerNotes}`
									: 'No additional notes provided.'}
							</Text>
						</View>
					</View>

					{/* ETA and Distance Cards */}
					<View style={styles.infoCardsRow}>
						<View style={styles.infoCard}>
							<Text style={styles.infoIcon}>🕐</Text>
							<Text style={styles.infoLabel}>ETA to Pickup</Text>
							<Text style={styles.infoValue}>
								{request.estimatedETA ? `${request.estimatedETA} min` : '--'}
							</Text>
						</View>
						<View style={styles.infoCard}>
							<Text style={styles.infoIcon}>✈️</Text>
							<Text style={styles.infoLabel}>Total Distance</Text>
							<Text style={styles.infoValue}>
								{request.totalJobDistance
									? `${request.totalJobDistance} mi`
									: '--'}
							</Text>
						</View>
					</View>
				</ScrollView>

				{/* Action Buttons */}
				<View style={styles.buttonContainer}>
					<TouchableOpacity
						style={[styles.acceptButton, isLoading && { opacity: 0.5 }]}
						onPress={onAccept}
						disabled={isLoading}
					>
						<Text style={styles.acceptButtonText}>
							{isLoading ? 'Processing...' : 'Accept Request'}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.declineButton}
						onPress={onDecline}
						disabled={isLoading}
					>
						<Text style={styles.declineButtonText}>Decline</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5F5F5',
	},
	scrollView: {
		flex: 1,
	},
	header: {
		backgroundColor: 'white',
		padding: 20,
		paddingTop: 60,
		alignItems: 'center',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	timer: {
		fontSize: 20,
		fontWeight: '600',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 16,
	},
	progressBarContainer: {
		width: '100%',
		height: 6,
		backgroundColor: '#E0E0E0',
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressBar: {
		height: '100%',
		backgroundColor: '#007AFF',
		borderRadius: 3,
	},
	card: {
		backgroundColor: 'white',
		marginHorizontal: 16,
		marginTop: 16,
		padding: 16,
		borderRadius: 12,
	},
	cardRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	initialsCircle: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#F0F0F0',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	initialsText: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333',
	},
	commuterInfo: {
		flex: 1,
	},
	commuterName: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 4,
	},
	iconCircle: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: '#E3F2FD',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	iconText: {
		fontSize: 24,
	},
	locationInfo: {
		flex: 1,
	},
	locationLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	address: {
		fontSize: 16,
		fontWeight: '500',
		marginBottom: 4,
	},
	distance: {
		fontSize: 14,
		color: '#666',
	},
	serviceCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	serviceLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	serviceType: {
		fontSize: 16,
		fontWeight: '500',
	},
	fareContainer: {
		alignItems: 'flex-end',
	},
	fareLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	fare: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#34C759',
	},
	sectionContent: {
		flex: 1,
	},
	sectionLabel: {
		fontSize: 14,
		color: '#666',
		marginBottom: 8,
	},
	vehicleText: {
		fontSize: 16,
		fontWeight: '500',
	},
	notesText: {
		fontSize: 16,
		lineHeight: 24,
		color: '#333',
	},
	infoCardsRow: {
		flexDirection: 'row',
		gap: 12,
		marginHorizontal: 16,
		marginTop: 16,
		marginBottom: 16,
	},
	infoCard: {
		flex: 1,
		backgroundColor: 'white',
		padding: 20,
		borderRadius: 12,
		alignItems: 'center',
	},
	infoIcon: {
		fontSize: 32,
		marginBottom: 8,
	},
	infoLabel: {
		fontSize: 14,
		color: '#666',
		marginBottom: 8,
		textAlign: 'center',
	},
	infoValue: {
		fontSize: 20,
		fontWeight: '600',
		color: '#333',
	},
	buttonContainer: {
		padding: 16,
		backgroundColor: 'white',
		borderTopWidth: 1,
		borderTopColor: '#E0E0E0',
	},
	acceptButton: {
		backgroundColor: '#007AFF',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		marginBottom: 12,
	},
	acceptButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold',
	},
	declineButton: {
		backgroundColor: 'white',
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E0E0E0',
	},
	declineButtonText: {
		color: '#333',
		fontSize: 18,
		fontWeight: '600',
	},
	serviceTypeContainer: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'center',
	},
});
