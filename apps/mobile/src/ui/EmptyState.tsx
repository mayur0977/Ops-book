import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { size, space, useTheme } from './theme/index';

export interface EmptyStateProps {
  /** One sentence. No illustration, no mascot. */
  message: string;
  action?: { label: string; onPress: () => void };
  /**
   * An empty list and a failed request must never look the same. Setting this
   * is what keeps "nothing here yet" from being mistaken for "we could not
   * load it", which is the difference between calm and a support call.
   */
  variant?: 'empty' | 'error' | 'offline';
}

export function EmptyState({ message, action, variant = 'empty' }: EmptyStateProps) {
  const theme = useTheme();
  const tone =
    variant === 'error'
      ? theme.status.danger
      : variant === 'offline'
        ? theme.status.info
        : theme.color.ink2;

  return (
    <View style={{ paddingHorizontal: space.lg }}>
      <View style={{ height: size.hairline, backgroundColor: theme.color.ruleStrong }} />
      <View
        style={{ paddingVertical: space.xl, gap: space.lg, alignItems: 'flex-start' }}
      >
        <Text variant="body" style={{ color: tone }}>
          {message}
        </Text>
        {action ? (
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        ) : null}
      </View>
    </View>
  );
}
