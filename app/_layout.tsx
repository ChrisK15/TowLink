import { AuthProvider, useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
	anchor: '(auth)',
};

function RootLayoutNav() {
	const { user, role, loading, signOut } = useAuth();

	useEffect(() => {
		if (!loading && user && role === null) {
			Alert.alert(
				'Account Error',
				'Your account role is missing or invalid. Please sign in again and complete role selection.',
				[{ text: 'OK', onPress: () => signOut() }],
			);
		}
	}, [loading, user, role, signOut]);

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" />
			</View>
		);
	}
	if (!user) {
		return <Redirect href="/(auth)" />;
	}
	if (role === 'commuter') {
		return <Redirect href="/(commuter)" />;
	}
	if (role === 'driver') {
		return <Redirect href="/(driver)" />;
	}
	if (!loading && user && role === null) {
		return <Redirect href="/(auth)" />;
	}
}

export default function RootLayout() {
	const colorScheme = useColorScheme();

	return (
		<AuthProvider>
			<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
				<RootLayoutNav />
				<Stack>
					<Stack.Screen name="(auth)" options={{ headerShown: false }} />
					<Stack.Screen name="(commuter)" options={{ headerShown: false }} />
					<Stack.Screen name="(driver)" options={{ headerShown: false }} />
				</Stack>
				<StatusBar style="auto" />
			</ThemeProvider>
		</AuthProvider>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
