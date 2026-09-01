/**
 * NativeWind reads this, but the tokens live in src/ui/theme/tokens.ts and are
 * imported here rather than duplicated. Two copies of the palette would drift,
 * and the design system says the identity is defined once.
 */
const { lightColors, lightStatus, radius, space } = require('./src/ui/theme/tokens.ts');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { ...lightColors, ...lightStatus },
      borderRadius: {
        control: radius.control,
        surface: radius.surface,
        full: radius.full,
      },
      spacing: space,
    },
  },
  plugins: [],
};
