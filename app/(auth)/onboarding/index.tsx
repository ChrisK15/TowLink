import { FlatList, Pressable, Text, View, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { SlideData } from '@/types/onboarding';
import OnboardingHeader from '@/components/onboarding/OnboardingHeader';
import OnboardingSlide from '@/components/onboarding/OnboardingSlide';
import PaginationDots from '@/components/onboarding/PaginationDots';

const { width: screenWidth } = Dimensions.get('window');

const SLIDES: SlideData[] = [
	{
		id: 'welcome',
		iconName: 'location',
		heading: 'Welcome to TowLink',
		subtext: 'The fastest way to get roadside assistance or earn money helping others on the road.',
	},
	{
		id: 'fast',
		iconName: 'flash',
		heading: 'Fast & Reliable',
		subtext: 'Connect in minutes. Real-time tracking and in-app communication for a seamless experience.',
	},
	{
		id: 'secure',
		iconName: 'shield-checkmark',
		heading: 'Safe & Secure',
		subtext: 'All users are verified. Ratings and reviews ensure quality service every time.',
	},
];

export default function OnboardingScreen() {
	const [activeIndex, setActiveIndex] = useState(0);
	const flatListRef = useRef<FlatList>(null);
	const router = useRouter();

	const handleScrollEnd = (e: any) => {
		const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
		setActiveIndex(index);
	};

	const handleNext = () => {
		// Guard: if on last slide, navigate to role selection
		if (activeIndex >= SLIDES.length - 1) {
			router.push('/(auth)/onboarding/role-selection' as any);
			return;
		}
		flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
	};

	return (
		<SafeAreaView style={styles.container}>
			<OnboardingHeader tagline="Roadside Assistance On-Demand" />
			<FlatList
				ref={flatListRef}
				data={SLIDES}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<OnboardingSlide
						iconName={item.iconName}
						heading={item.heading}
						subtext={item.subtext}
					/>
				)}
				onMomentumScrollEnd={handleScrollEnd}
			/>
			<View style={styles.bottom}>
				<PaginationDots total={SLIDES.length} activeIndex={activeIndex} />
				<Pressable style={styles.button} onPress={handleNext}>
					<Text style={styles.buttonText}>
						{activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'} →
					</Text>
				</Pressable>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	bottom: {
		paddingHorizontal: 24,
		paddingBottom: 40,
		alignItems: 'center',
	},
	button: {
		width: '100%',
		backgroundColor: '#2176FF',
		borderRadius: 30,
		paddingVertical: 16,
		alignItems: 'center',
		marginTop: 24,
	},
	buttonText: {
		color: '#fff',
		fontSize: 17,
		fontWeight: 'bold',
	},
});
