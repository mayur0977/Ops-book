import { View } from 'react-native';
import { Text } from './Text';
import { size, space, useTheme } from './theme/index';

export interface SectionHeaderProps {
  title: string;
  trailing?: string;
}

/**
 * Straight from the ledger's column header: an 11pt uppercase letterspaced
 * label with a `rule-strong` line beneath it running the full width.
 *
 * Used consistently, this is more recognisable than a logo would be.
 */
export function SectionHeader({ title, trailing }: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="header"
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: space.lg,
        paddingTop: space.xl,
        paddingBottom: space.sm,
        borderBottomWidth: size.hairline,
        borderBottomColor: theme.color.ruleStrong,
      }}
    >
      <Text variant="label" tone="ink3">
        {title}
      </Text>
      {trailing ? (
        <Text variant="label" tone="ink3">
          {trailing}
        </Text>
      ) : null}
    </View>
  );
}
