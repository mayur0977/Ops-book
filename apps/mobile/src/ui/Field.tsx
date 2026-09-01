import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Text } from './Text';
import { radius, size, space, tabularNums, useTheme } from './theme/index';
import type { TextInputProps } from 'react-native';

export interface FieldProps extends Omit<TextInputProps, 'style' | 'onBlur'> {
  label: string;
  error?: string | null;
  hint?: string;
  /** Amounts, quantities and counts get tabular figures so they do not jitter. */
  numeric?: boolean;
  onBlur?: () => void;
}

/**
 * Label above in `label` type, input on `surface-sunk` with a `rule` border.
 *
 * The error appears **on blur, never on every keystroke** — validating as
 * someone types tells them they are wrong before they have finished being
 * right, which on a form filled fifty times a day is just noise.
 */
export function Field({ label, error, hint, numeric, onBlur, ...rest }: FieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const showError = Boolean(error) && touched;

  const borderColor = showError
    ? theme.status.danger
    : focused
      ? theme.color.accent
      : theme.color.rule;

  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label" tone="ink3">
        {label}
      </Text>

      <TextInput
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={theme.color.ink3}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setTouched(true);
          onBlur?.();
        }}
        style={{
          height: size.field,
          borderWidth: size.hairline,
          borderColor,
          borderRadius: radius.control,
          backgroundColor: theme.color.surfaceSunk,
          paddingHorizontal: space.md,
          color: theme.color.ink,
          fontSize: 17,
          ...(numeric ? tabularNums : {}),
        }}
      />

      {showError ? (
        <Text variant="caption" style={{ color: theme.status.danger }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="ink3">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
