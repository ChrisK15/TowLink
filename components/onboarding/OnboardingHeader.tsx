import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface OnboardingHeaderProps {
	tagline: string;
	onDarkModeToggle?: () => void;
	isDarkMode?: boolean;
}

export default function OnboardingHeader({
	tagline,
	onDarkModeToggle,
}: OnboardingHeaderProps) {
	return (
		<View>
			<View style={styles.topRow}>
				<View style={styles.logoRow}>
					<Text style={styles.emoji}>🚛</Text>
					<Text style={styles.logoText}>TowLink</Text>
				</View>
				<Pressable onPress={() => onDarkModeToggle?.()} style={styles.moonButton}>
					<Ionicons name="moon-outline" size={24} color="#333" />
				</Pressable>
			</View>
			<Text style={styles.tagline}>{tagline}</Text>
			<View style={styles.divider} />
		</View>
	);
}

const styles = StyleSheet.create({
	topRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 8,
	},
	logoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	moonButton: {
		position: 'absolute',
		right: 20,
	},
	emoji: {
		fontSize: 24,
	},
	logoText: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#1A1A2E',
	},
	tagline: {
		textAlign: 'center',
		fontSize: 13,
		color: '#555',
		paddingBottom: 12,
		paddingHorizontal: 20,
	},
	divider: {
		height: 1,
		backgroundColor: '#E0E0E0',
	},
});
