import { Ionicons } from '@expo/vector-icons';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingSlideProps {
	iconName: string;
	heading: string;
	subtext: string;
}

export default function OnboardingSlide({
	iconName,
	heading,
	subtext,
}: OnboardingSlideProps) {
	return (
		<View style={styles.root}>
			<View style={styles.iconCircle}>
				<Ionicons name={iconName as any} size={72} color="#1E6FD9" />
			</View>
			<Text style={styles.heading}>{heading}</Text>
			<Text style={styles.subtext}>{subtext}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	root: {
		width: screenWidth,
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
	},
	iconCircle: {
		width: 160,
		height: 160,
		borderRadius: 80,
		backgroundColor: '#EBF4FD',
		justifyContent: 'center',
		alignItems: 'center',
	},
	heading: {
		fontSize: 28,
		fontWeight: 'bold',
		marginTop: 40,
		textAlign: 'center',
		color: '#1A1A2E',
	},
	subtext: {
		fontSize: 16,
		color: '#555555',
		textAlign: 'center',
		lineHeight: 24,
		marginTop: 16,
	},
});
