import { Ionicons } from '@expo/vector-icons';
import type React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface RoleCardProps {
	iconName: React.ComponentProps<typeof Ionicons>['name'];
	title: string;
	description: string;
	ctaLabel: string;
	onPress: () => void;
}

export default function RoleCard({ iconName, title, description, ctaLabel, onPress }: RoleCardProps) {
	return (
		<Pressable style={styles.card} onPress={onPress}>
			<View style={styles.iconBox}>
				<Ionicons name={iconName} size={28} color="#1E6FD9" />
			</View>
			<View style={styles.textArea}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.description}>{description}</Text>
				<Text style={styles.cta}>{ctaLabel} →</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		padding: 20,
		borderWidth: 1,
		borderColor: '#E0E0E0',
		borderRadius: 12,
		backgroundColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.06,
		shadowRadius: 4,
		elevation: 2,
	},
	iconBox: {
		width: 52,
		height: 52,
		borderRadius: 10,
		backgroundColor: '#EBF4FD',
		justifyContent: 'center',
		alignItems: 'center',
	},
	textArea: {
		flex: 1,
	},
	title: {
		fontSize: 17,
		fontWeight: 'bold',
		color: '#1A1A2E',
		marginBottom: 4,
	},
	description: {
		fontSize: 14,
		color: '#555555',
		lineHeight: 20,
		marginBottom: 8,
	},
	cta: {
		fontSize: 14,
		color: '#1E6FD9',
		fontWeight: '600',
	},
});
