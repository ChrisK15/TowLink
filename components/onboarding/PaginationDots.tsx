import { View, StyleSheet } from 'react-native';

interface PaginationDotsProps {
	total: number;
	activeIndex: number;
}

export default function PaginationDots({ total, activeIndex }: PaginationDotsProps) {
	return (
		<View style={styles.container}>
			{Array.from({ length: total }, (_, i) => i).map((i) => (
				<View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#C4C4C4',
		marginHorizontal: 3,
	},
	dotActive: {
		width: 24,
		backgroundColor: '#1E6FD9',
	},
});
