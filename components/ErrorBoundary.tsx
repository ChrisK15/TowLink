import { Ionicons } from '@expo/vector-icons';
import React, { Component, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error) {
		console.error('ErrorBoundary caught:', error);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback ?? (
					<View style={styles.container}>
						<Ionicons name="warning-outline" size={48} color="#FF3B30" />
						<Text style={styles.heading}>Something went wrong</Text>
						<Text style={styles.body}>Please restart the app.</Text>
					</View>
				)
			);
		}
		return this.props.children;
	}
}

export class MapErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error) {
		console.error('MapErrorBoundary caught:', error);
	}

	render() {
		if (this.state.hasError) {
			return (
				<View style={styles.container}>
					<Ionicons name="warning-outline" size={48} color="#FF3B30" />
					<Text style={styles.heading}>Map unavailable</Text>
					<Text style={styles.body}>
						The map could not be loaded. Core functionality is still available.
					</Text>
				</View>
			);
		}
		return this.props.children;
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 32,
		backgroundColor: '#FFFFFF',
	},
	heading: {
		fontSize: 22,
		fontWeight: '700',
		color: '#000000',
		marginTop: 16,
	},
	body: {
		fontSize: 15,
		fontWeight: '400',
		color: '#666666',
		marginTop: 8,
		textAlign: 'center',
	},
});
