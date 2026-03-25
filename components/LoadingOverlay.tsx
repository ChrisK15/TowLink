import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

interface LoadingOverlayProps {
	visible: boolean;
	message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
	return (
		<Modal transparent visible={visible} animationType="none">
			<View style={styles.container}>
				<ActivityIndicator size="large" color="#1565C0" />
				{message ? <Text style={styles.message}>{message}</Text> : null}
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	message: {
		marginTop: 16,
		fontSize: 14,
		fontWeight: '400',
		color: '#FFFFFF',
	},
});
