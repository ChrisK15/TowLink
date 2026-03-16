import { useEffect, useRef } from 'react';
import {
	Alert,
	Animated,
	ActivityIndicator,
	Modal,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
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
}

export function FindingDriverModal({
	visible,
	requestId,
	onDriverFound,
	onCancel,
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
						Alert.alert(
							'Something went wrong',
							'Could not find your trip. Please try again.',
						);
						onCancel();
					}
				}
			});
		}

		if (request.status === 'cancelled') {
			Alert.alert(
				'Request Cancelled',
				'Your request was cancelled. Please try again.',
			);
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

				{/* Cancel / Try Again button */}
				<View style={styles.footer}>
					<TouchableOpacity
						style={styles.cancelButton}
						onPress={isNoDrivers ? onCancel : handleCancelRequest}
					>
						<Text style={styles.cancelButtonText}>
							{isNoDrivers ? 'Try Again' : 'Cancel Request'}
						</Text>
					</TouchableOpacity>
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
