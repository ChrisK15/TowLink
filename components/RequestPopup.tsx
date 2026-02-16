import { Request } from '@/types/models';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RequestPopupProps {
	request?: Request;
	visible: boolean;
	onAccept: () => void;
	onDecline: () => void;
}

export function RequestPopup({
	request,
	visible,
	onAccept,
	onDecline,
}: RequestPopupProps) {
	// TODO: Create a ref to control the bottom sheet
	const bottomSheetRef = useRef<BottomSheet>(null);

	// TODO: Define snap points using useMemo
	// What does '50%' mean? What does '85%' mean?
	const snapPoints = useMemo(() => ['50%', '85%'], []);

	// TODO: Create backdrop renderer using useCallback
	// Why do we need a backdrop?
	const renderBackdrop = useCallback(
		(props: any) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				opacity={0.5}
			/>
		),
		[],
	);

	if (!request) {
		return null;
	}

	// TODO: Return the BottomSheet component
	// For now, just put "Hello World" inside it
	return (
		<BottomSheet
			ref={bottomSheetRef}
			index={visible ? 0 : -1}
			snapPoints={snapPoints}
			enablePanDownToClose={true}
			backdropComponent={renderBackdrop}
		>
			<View style={styles.contentContainer}>
				<Text>Hello World - Bottom Sheet Works!</Text>
			</View>
		</BottomSheet>
	);
}

const styles = StyleSheet.create({
	contentContainer: {
		flex: 1,
		padding: 20,
	},
});
