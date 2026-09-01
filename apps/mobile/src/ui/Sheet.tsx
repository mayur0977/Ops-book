import { Modal, Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useShouldTravel } from './motion';
import { duration, floatingShadow, radius, size, space, useTheme } from './theme/index';
import type { ReactNode } from 'react';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * A bottom sheet — one of only two things in the app allowed a drop shadow.
 *
 * Under Reduce Motion the sheet cross-fades instead of travelling. The
 * feedback is replaced, never removed: the user still sees it arrive.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme();
  const shouldTravel = useShouldTravel();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={FadeIn.duration(duration.standard)}
        exiting={FadeOut.duration(duration.instant)}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'flex-end',
        }}
      >
        {/* Tapping the backdrop dismisses; the sheet itself does not. */}
        <Pressable accessibilityLabel="Dismiss" style={{ flex: 1 }} onPress={onClose} />

        <Animated.View
          entering={
            shouldTravel
              ? SlideInDown.duration(duration.standard)
              : FadeIn.duration(duration.instant)
          }
          exiting={
            shouldTravel
              ? SlideOutDown.duration(duration.quick)
              : FadeOut.duration(duration.instant)
          }
          style={{
            backgroundColor: theme.color.surface,
            borderTopLeftRadius: radius.surface,
            borderTopRightRadius: radius.surface,
            paddingBottom: space.xxl,
            ...floatingShadow,
          }}
        >
          <View
            style={{
              paddingHorizontal: space.lg,
              paddingVertical: space.lg,
              borderBottomWidth: size.hairline,
              borderBottomColor: theme.color.rule,
            }}
          >
            <Text variant="title">{title}</Text>
          </View>
          <View style={{ padding: space.lg, gap: space.lg }}>{children}</View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
