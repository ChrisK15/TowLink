import { AuthProvider, useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

export const unstable_settings = {
	anchor: '(auth)',
};

function RootLayoutNav() {
	const { user, role, loading } = useAuth();

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
	if (role === null) {
		return <Redirect href="/role-selection" />; //role: null is expected during signup so we route to role-selection instead of signing out.

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
