import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoadingOverlay } from '@/components/LoadingOverlay';

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
		return <LoadingOverlay visible={true} />;
	}

	if (onboardingComplete) {
		return <Redirect href="/(auth)/onboarding/commuter-login" />;
	}

	return <Redirect href={"/(auth)/onboarding" as any} />;
}
