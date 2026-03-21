import { RouteStep } from '@/services/directions';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface InstructionCardProps {
	currentStep: RouteStep | null;
	isCalculating: boolean; // show "Calculating route..." when true
	hasArrived: boolean; // show "You have arrived" when true
}

function getIconName(
	maneuver: string,
): React.ComponentProps<typeof Ionicons>['name'] {
	if (maneuver.includes('turn-right') || maneuver === 'ramp-right') {
		return 'arrow-forward';
	}
	if (maneuver.includes('turn-left') || maneuver === 'ramp-left') {
		return 'arrow-back';
	}
	if (maneuver === 'straight' || maneuver.startsWith('head')) {
		return 'arrow-up';
	}
	return 'navigate';
}

export function InstructionCard({
	currentStep,
	isCalculating,
	hasArrived,
}: InstructionCardProps) {
	const opacity = useRef(new Animated.Value(1)).current;
	const [displayedStep, setDisplayedStep] = useState<RouteStep | null>(
		currentStep,
	);

	useEffect(() => {
		// Fade out, swap content, fade in — 200ms total
		Animated.timing(opacity, {
			toValue: 0,
			duration: 100,
			useNativeDriver: true,
		}).start(() => {
			setDisplayedStep(currentStep);
			Animated.timing(opacity, {
				toValue: 1,
				duration: 100,
				useNativeDriver: true,
			}).start();
		});
	}, [currentStep]);

	const renderContent = () => {
		if (isCalculating) {
			return (
				<View style={styles.row}>
					<Ionicons name="navigate" size={24} color="#34C759" />
					<Text style={styles.instruction}>Calculating route...</Text>
				</View>
			);
		}
		if (hasArrived) {
			return (
				<View style={styles.row}>
					<Ionicons name="checkmark-circle" size={24} color="#34C759" />
					<Text style={styles.instruction}>You have arrived</Text>
				</View>
			);
		}
		if (!displayedStep) {
			return (
				<View style={styles.row}>
					<Ionicons name="navigate" size={24} color="#34C759" />
					<Text style={styles.instruction}>Calculating route...</Text>
				</View>
			);
		}
		return (
			<View style={styles.row}>
				<Ionicons
					name={getIconName(displayedStep.maneuver)}
					size={24}
					color="#34C759"
				/>
				<View style={styles.textColumn}>
					<Text style={styles.instruction}>{displayedStep.instruction}</Text>
					<Text style={styles.distance}>{displayedStep.distanceText}</Text>
				</View>
			</View>
		);
	};

	return (
		<Animated.View style={[styles.card, { opacity }]}>
			{renderContent()}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	card: {
		position: 'absolute',
		top: 60,
		left: 16,
		right: 16,
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 16,
		// iOS shadow
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		// Android shadow
		elevation: 4,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	textColumn: {
		flex: 1,
	},
	instruction: {
		fontSize: 17,
		fontWeight: '700',
		color: '#000',
	},
	distance: {
		fontSize: 14,
		fontWeight: '400',
		color: '#666',
		marginTop: 2,
	},
});
