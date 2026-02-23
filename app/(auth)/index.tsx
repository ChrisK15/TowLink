import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthIndex() {
	const [isLoading, setIsLoading] = useState(true);
	const [onboardingComplete, setOnboardingComplete] = useState(false);

	useEffect(() => {
		async function checkOnboarding() {
			try {
				const value = await AsyncStorage.getItem('onboarding_complete');
				setOnboardingComplete(value === 'true');
			} catch {
				// On error, default to showing onboarding rather than skipping it
				setOnboardingComplete(false);
			} finally {
				setIsLoading(false);
			}
		}
		checkOnboarding();
	}, []);

	if (isLoading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (onboardingComplete) {
		return <Redirect href="/(auth)/signup" />;
	}

	return <Redirect href={"/(auth)/onboarding" as any} />;
}
