import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdminLayout() {
	const colorScheme = useColorScheme();

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
				headerShown: false,
				tabBarButton: HapticTab,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Jobs',
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="briefcase.fill" color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="drivers"
				options={{
					title: 'Drivers',
					tabBarIcon: ({ color }) => (
						<IconSymbol size={28} name="person.2.fill" color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
