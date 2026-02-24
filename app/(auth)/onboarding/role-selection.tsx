import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import RoleCard from '@/components/onboarding/RoleCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RoleSelectionScreen() {
	const router = useRouter();

	const handleCustomer = async () => {
		await AsyncStorage.setItem('onboarding_complete', 'true');
		router.replace('/(auth)/signup');
	};

	const handleDriver = async () => {
		await AsyncStorage.setItem('onboarding_complete', 'true');
		router.replace('/(auth)/signup');
	};

	return (
		<SafeAreaView style={styles.container}>
			<OnboardingHeader tagline="Choose how you want to use TowLink" />
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.cardsContainer}>
					<Text style={styles.heading}>I want to...</Text>
					<RoleCard
						iconName="person"
						title="Get Roadside Assistance"
						description="Request towing, jump starts, tire changes, and more. Help arrives in minutes."
						ctaLabel="Continue as Customer"
						onPress={handleCustomer}
					/>
					<RoleCard
						iconName="car"
						title="Drive & Earn Money"
						description="Be your own boss. Set your schedule and earn money providing roadside assistance."
						ctaLabel="Continue as Driver"
						onPress={handleDriver}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignContent: 'center',
		backgroundColor: '#fff',
	},
	content: {
		flexGrow: 1,
		justifyContent: 'center',
		padding: 24,
		marginBottom: 125,
	},
	cardsContainer: {
		flex: 1,
		justifyContent: 'center',
		gap: 16,
	},
	heading: {
		fontSize: 32,
		fontWeight: 'bold',
		color: '#1A1A2E',
		textAlign: 'center',
		marginBottom: 8,
	},
});
