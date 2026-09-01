import { View } from 'react-native';
import { Text } from './Text';
import { radius, space, statusWash, useTheme, type StatusTone } from './theme/index';

export interface ChipProps {
  /** Always a word. A chip never communicates by colour alone. */
  label: string;
  tone?: StatusTone;
}

/**
 * Status as a pill: `label` type in the status colour, on a 12% wash of the
 * same colour. The wash is derived from the colour rather than being a second
 * token, so adding a status cannot forget to add its background.
 */
export function Chip({ label, tone = 'neutral' }: ChipProps) {
  const theme = useTheme();
  const color = theme.status[tone];

  return (
    <View
      accessibilityRole="text"
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: space.md,
        paddingVertical: space.xs,
        borderRadius: radius.full,
        backgroundColor: statusWash(color),
      }}
    >
      <Text variant="label" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
