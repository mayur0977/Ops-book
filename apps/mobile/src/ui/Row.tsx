import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from './Text';
import { haptic, useShouldTravel } from './motion';
import { duration, size, space, useTheme, type StatusTone } from './theme/index';
import type { ReactNode } from 'react';

export interface RowProps {
  /** `heading` type. The worker's name, the order's title. */
  title: string;
  /** `secondary` type in `ink-2`. Status and time, usually. */
  subtitle?: string;
  /**
   * The 3pt margin rail. This is the signature element of the system — a mark
   * in the ledger's margin — and it appears in every list in the app.
   *
   * Omitting it renders the rail transparent rather than collapsing it, so
   * rows with and without a status still align down the column.
   */
  tone?: StatusTone;
  /**
   * Colour is never the only signal: roughly one in twelve men has a colour
   * vision deficiency and this user base skews heavily male. A toned row
   * carries a letter or word too.
   */
  marker?: string;
  /** Right-hand column. Right-aligned, and tabular if it is a number. */
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  twoLine?: boolean;
}

/**
 * One row = one event. The app is mostly lists of these.
 *
 * No card, no shadow, no gap between rows — a bottom hairline separates them,
 * exactly as ruled lines do on paper. Cards would break the column alignment
 * that makes a ledger readable.
 */
export function Row({
  title,
  subtitle,
  tone,
  marker,
  trailing,
  onPress,
  accessibilityLabel,
  twoLine,
}: RowProps) {
  const theme = useTheme();
  const shouldTravel = useShouldTravel();
  const pressed = useSharedValue(0);

  // Press feedback is scale + a sunk background. Under Reduce Motion the scale
  // is dropped and the background change stays, so the tap still registers.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: shouldTravel ? [{ scale: 1 - pressed.value * 0.02 }] : [],
    backgroundColor: pressed.value > 0 ? theme.color.surfaceSunk : theme.color.surface,
  }));

  const body = (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: twoLine ? size.rowTwoLine : size.rowMin,
          borderBottomWidth: size.hairline,
          borderBottomColor: theme.color.rule,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: size.marginRail,
          alignSelf: 'stretch',
          backgroundColor: tone ? theme.status[tone] : 'transparent',
        }}
      />
      <View
        style={{
          flex: 1,
          paddingVertical: space.md,
          paddingLeft: space.md,
          paddingRight: space.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="heading" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="secondary" tone="ink2" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {marker ? (
          <Text
            variant="label"
            style={{ color: tone ? theme.status[tone] : theme.color.ink3 }}
          >
            {marker}
          </Text>
        ) : null}

        {trailing ? <View style={{ alignItems: 'flex-end' }}>{trailing}</View> : null}
      </View>
    </Animated.View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: duration.instant });
        void haptic('light');
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: duration.instant });
      }}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}
