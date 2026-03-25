import { useEffect, useRef } from 'react';
import {
	Animated,
	ActivityIndicator,
	Modal,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useWatchRequest } from '@/hooks/use-watch-request';
import {
	cancelRequest,
	getTripByRequestId,
} from '@/services/firebase/firestore';

interface FindingDriverModalProps {
	visible: boolean;
	requestId: string | null;
	onDriverFound: (tripId: string) => void;
	onCancel: () => void;
	onRetry: () => void;
}

export function FindingDriverModal({
	visible,
	requestId,
	onDriverFound,
	onCancel,
	onRetry,
}: FindingDriverModalProps) {
	const { request } = useWatchRequest(requestId);

	const dot1Anim = useRef(new Animated.Value(0)).current;
	const dot2Anim = useRef(new Animated.Value(0)).current;
	const dot3Anim = useRef(new Animated.Value(0)).current;
	const contentOpacity = useRef(new Animated.Value(1)).current;

	const isNoDrivers = request?.status === 'no_drivers';

	// Three-dot pulse animation
	useEffect(() => {
		if (!visible || isNoDrivers) return;

		const makePulse = (anim: Animated.Value, delay: number) =>
			Animated.sequence([
				Animated.delay(delay),
				Animated.timing(anim, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}),
				Animated.timing(anim, {
					toValue: 0.3,
					duration: 400,
					useNativeDriver: true,
				}),
			]);

		const loop = Animated.loop(
			Animated.parallel([
				makePulse(dot1Anim, 0),
				makePulse(dot2Anim, 200),
				makePulse(dot3Anim, 400),
			]),
		);
		loop.start();
		return () => loop.stop();
	}, [visible, isNoDrivers, dot1Anim, dot2Anim, dot3Anim]);

	// React to request status changes
	useEffect(() => {
		if (!request || !requestId) return;

		if (request.status === 'no_drivers') {
			// Fade out current content, then back in with no_drivers state
			Animated.timing(contentOpacity, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}).start(() => {
				Animated.timing(contentOpacity, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}).start();
			});
		}

		if (request.status === 'accepted') {
			const commuterId = request.commuterId;
			getTripByRequestId(requestId, commuterId).then(async (trip) => {
				if (trip) {
					onDriverFound(trip.id);
				} else {
					// Brief Firestore lag — retry once after 1 second
					await new Promise((resolve) => setTimeout(resolve, 1000));
					const retryTrip = await getTripByRequestId(requestId, commuterId);
					if (retryTrip) {
						onDriverFound(retryTrip.id);
					} else {
						Toast.show({ type: 'error', text1: 'Could not find your trip', text2: 'Please try again.', visibilityTime: 3000 });
						onCancel();
					}
				}
			});
		}

		if (request.status === 'cancelled') {
			Toast.show({ type: 'info', text1: 'Request cancelled', text2: 'Please try again.', visibilityTime: 3000 });
			onCancel();
		}
	}, [request?.status, requestId, onDriverFound, onCancel, contentOpacity]);

	const handleCancelRequest = async () => {
		if (!requestId) return;
		try {
			await cancelRequest(requestId);
		} finally {
			onCancel();
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onCancel}
		>
			<View style={styles.container}>
				{/* Header */}
				<View style={styles.header}>
					<View>
						<Text style={styles.title}>Finding Driver</Text>
						<Text style={styles.subtitle}>Searching for available drivers...</Text>
					</View>
					<TouchableOpacity onPress={onCancel} style={styles.closeButton}>
						<Text style={styles.closeButtonText}>✕</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.divider} />

				{/* Center content */}
				<Animated.View style={[styles.content, { opacity: contentOpacity }]}>
					{isNoDrivers ? (
						<>
							<Text style={styles.noDriversIcon}>⚠️</Text>
							<Text style={styles.headline}>No Drivers Available</Text>
							<Text style={styles.body}>
								All nearby tow yards are currently busy. Please try again in a few
								minutes.
							</Text>
						</>
					) : (
						<>
							<View style={styles.spinnerCircle}>
								<ActivityIndicator size="large" color="#1565C0" />
							</View>

							<Text style={styles.headline}>Finding the Best Available Driver</Text>
							<Text style={styles.body}>
								We&apos;re matching you with a qualified driver near your location.
								This usually takes a few seconds.
							</Text>

							{/* Animated dots */}
							<View style={styles.dotsRow}>
								<Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
								<Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
								<Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
							</View>
						</>
					)}
				</Animated.View>

				{/* Footer buttons */}
				<View style={styles.footer}>
					{isNoDrivers ? (
						<>
							<TouchableOpacity
								testID="try-again-btn"
								style={styles.retryButton}
								onPress={async () => {
									if (requestId) await cancelRequest(requestId);
									onRetry();
								}}
							>
								<Text style={styles.retryButtonText}>Try Again</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.dismissButton}
								onPress={async () => {
									if (requestId) await cancelRequest(requestId);
									onCancel();
								}}
							>
								<Text style={styles.dismissButtonText}>Dismiss</Text>
							</TouchableOpacity>
						</>
					) : (
						<TouchableOpacity
							testID="cancel-search-btn"
							style={styles.cancelButton}
							onPress={handleCancelRequest}
						>
							<Text style={styles.cancelButtonText}>Cancel Request</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		paddingHorizontal: 24,
		paddingTop: 24,
		paddingBottom: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#000',
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		marginTop: 2,
	},
	closeButton: {
		padding: 4,
	},
	closeButtonText: {
		fontSize: 20,
		color: '#000',
	},
	divider: {
		height: 1,
		backgroundColor: '#E0E0E0',
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
	},
	spinnerCircle: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: '#E3F2FD',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 32,
	},
	headline: {
		fontSize: 22,
		fontWeight: 'bold',
		textAlign: 'center',
		color: '#000',
		marginBottom: 12,
	},
	body: {
		fontSize: 15,
		color: '#666',
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 24,
	},
	dotsRow: {
		flexDirection: 'row',
		gap: 10,
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#1565C0',
	},
	noDriversIcon: {
		fontSize: 48,
		marginBottom: 16,
	},
	footer: {
		padding: 24,
		borderTopWidth: 1,
		borderTopColor: '#E0E0E0',
		gap: 12,
	},
	retryButton: {
		backgroundColor: '#1565C0',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
	},
	retryButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#FFF',
	},
	dismissButton: {
		borderWidth: 1.5,
		borderColor: '#CCC',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
	},
	dismissButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#666',
	},
	cancelButton: {
		borderWidth: 1.5,
		borderColor: '#CCC',
		borderRadius: 12,
		paddingVertical: 16,
		alignItems: 'center',
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#000',
	},
});
