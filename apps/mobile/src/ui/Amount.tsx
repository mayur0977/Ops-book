import { View } from 'react-native';
import { compareMoney, isNegativeMoney } from '@daybook/core';
import type { Money } from '@daybook/contracts';
import { Text } from './Text';
import { radius, space, tabularNums, useTheme, type TypeRole } from './theme/index';

export interface AmountProps {
  /** A decimal string, never a number (ADR 0005). */
  value: Money;
  currency?: string;
  variant?: TypeRole;
  /** Marks a value as outstanding even when it is positive. */
  outstanding?: boolean;
}

/**
 * Money, set the way a ledger sets it: tabular figures, right-aligned, the
 * currency symbol quieter than the figure so the digits form the column.
 *
 * The value arrives as a string and is never parsed to a float — `@daybook/core`
 * does the comparing. A rounding paisa in a partner settlement is the exact
 * dispute this product exists to prevent.
 */
export function Amount({
  value,
  currency = '₹',
  variant = 'body',
  outstanding,
}: AmountProps) {
  const theme = useTheme();
  const negative = isNegativeMoney(value);
  const zero = compareMoney(value, '0.00') === 0;

  // Negative and outstanding values take `danger`, but the minus sign is never
  // the only indicator — the colour and the sign always travel together.
  const color = negative || outstanding ? theme.status.danger : theme.color.ink;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
      <Text variant="caption" tone="ink3">
        {currency}
      </Text>
      <Text
        variant={variant}
        style={{
          ...tabularNums,
          color: zero ? theme.color.ink3 : color,
          textAlign: 'right',
          fontWeight: '600',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export interface AmountBadgeProps extends AmountProps {
  label: string;
}

/** An amount with its own column header, for a total that needs naming. */
export function AmountBadge({ label, ...amount }: AmountBadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'flex-end',
        gap: space.xs,
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.surface,
        backgroundColor: theme.color.surfaceSunk,
      }}
    >
      <Text variant="label" tone="ink3">
        {label}
      </Text>
      <Amount {...amount} />
    </View>
  );
}
