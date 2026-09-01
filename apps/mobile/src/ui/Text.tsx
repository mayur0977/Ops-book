import { Text as RNText } from 'react-native';
import {
  useTheme,
  type ColorName,
  type TypeRole,
  type as typeScale,
} from './theme/index';
import type { TextProps as RNTextProps, TextStyle } from 'react-native';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  /**
   * The type-scale role. Named `variant` rather than `role` because React
   * Native already has a `role` prop for the ARIA role, and shadowing it would
   * quietly break accessibility semantics.
   */
  variant?: TypeRole;
  tone?: ColorName;
  style?: TextStyle | TextStyle[];
}

/**
 * Every piece of text in the app goes through here, so the type scale and the
 * colour tokens cannot be bypassed by accident.
 *
 * `allowFontScaling` is deliberately not exposed. The design system bans
 * turning it off, and the way that ban survives contact with a deadline is by
 * making it impossible to pass rather than by remembering not to.
 */
export function Text({ variant = 'body', tone = 'ink', style, ...rest }: TextProps) {
  const theme = useTheme();
  const scale = typeScale[variant] as TextStyle;

  return (
    <RNText
      {...rest}
      allowFontScaling
      style={[scale, { color: theme.color[tone] }, style ?? {}]}
    />
  );
}
