import { useColorScheme } from 'react-native';
import {
  darkColors,
  darkStatus,
  lightColors,
  lightStatus,
  type ColorName,
  type StatusTone,
} from './tokens';

export * from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  color: Record<ColorName, string>;
  status: Record<StatusTone, string>;
}

export const lightTheme: Theme = {
  scheme: 'light',
  color: lightColors,
  status: lightStatus,
};
export const darkTheme: Theme = { scheme: 'dark', color: darkColors, status: darkStatus };

/**
 * Dark mode is not an afterthought here: workshops are dim and many of these
 * phones sit in dark mode permanently. Both themes are first-class, and every
 * component reads its colours through this rather than importing a palette.
 */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
