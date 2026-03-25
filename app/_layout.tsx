import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider,
} from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
	anchor: '(auth)',
};

function RootLayoutNav() {
	const { user, role, loading } = useAuth();

	useEffect(() => {
		if (!loading) {
			SplashScreen.hideAsync();
		}
	}, [loading]);

	if (loading) {
		return null; // Splash screen is still visible
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
	if (role === 'admin') {
		return <Redirect href="/(admin)" />;
	}
	if (role === null) {
		return <Redirect href="/(auth)/onboarding/commuter-login" />;
	}
}

export default function RootLayout() {
	const colorScheme = useColorScheme();

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<AuthProvider>
				<BottomSheetModalProvider>
					<ThemeProvider
						value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
					>
						<ErrorBoundary>
							<RootLayoutNav />
						</ErrorBoundary>
						<Stack>
							<Stack.Screen name="(auth)" options={{ headerShown: false }} />
							<Stack.Screen
								name="(commuter)"
								options={{ headerShown: false }}
							/>
							<Stack.Screen name="(driver)" options={{ headerShown: false }} />
							<Stack.Screen name="(admin)" options={{ headerShown: false }} />
						</Stack>
						<StatusBar style="auto" />
					</ThemeProvider>
				</BottomSheetModalProvider>
			</AuthProvider>
			<Toast />
		</GestureHandlerRootView>
	);
}
