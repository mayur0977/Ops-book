import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { haptic, useShouldTravel } from './motion';
import { duration, radius, size, space, useTheme } from './theme/index';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}

/**
 * Borders over shadows: a secondary button is a hairline, not an elevation.
 * The only drop shadow in the app belongs to Quick Add and a bottom sheet.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const shouldTravel = useShouldTravel();
  const pressed = useSharedValue(0);

  const inert = Boolean(disabled) || Boolean(loading);

  const background =
    variant === 'primary'
      ? theme.color.accent
      : variant === 'danger'
        ? theme.status.danger
        : 'transparent';

  const foreground = variant === 'secondary' ? theme.color.accent : theme.color.surface;

  const animatedStyle = useAnimatedStyle(() => ({
    // Under Reduce Motion the scale is dropped; opacity still confirms the tap.
    transform: shouldTravel ? [{ scale: 1 - pressed.value * 0.02 }] : [],
    opacity: inert ? 0.5 : 1 - pressed.value * 0.1,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy: Boolean(loading) }}
      disabled={inert}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: duration.instant });
        void haptic('light');
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: duration.instant });
      }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          {
            minHeight: size.touchMin,
            borderRadius: radius.control,
            backgroundColor: background,
            borderWidth: variant === 'secondary' ? size.hairline : 0,
            borderColor: theme.color.rule,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: space.lg,
          },
          animatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={foreground} />
        ) : (
          <Text variant="heading" style={{ color: foreground }}>
            {label}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

/**
 * The one floating element in the app. Circular, accent, centred in the tab
 * bar — and it opens a sheet rather than navigating, so it is never a
 * destination the back button has to reason about.
 */
export function QuickAddButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add"
      onPress={() => {
        void haptic('medium');
        onPress();
      }}
    >
      <View
        style={{
          width: size.musterControl,
          height: size.musterControl,
          borderRadius: radius.full,
          backgroundColor: theme.color.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="title" style={{ color: theme.color.surface }}>
          +
        </Text>
      </View>
    </Pressable>
  );
}
