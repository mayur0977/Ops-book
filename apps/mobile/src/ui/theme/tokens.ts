/**
 * The "Ledger" identity, defined once (ADR 0006, docs/design/design-system.md).
 *
 * Root CLAUDE.md rule 11: a hardcoded colour, radius, font size or duration in
 * a component is a review-blocking error. Everything reads from here, and this
 * file is the only place a raw hex appears.
 *
 * Transcribed from the design system rather than invented. If a value here
 * disagrees with that document, the document is right.
 */

/* -------------------------------------------------------------------------
 * Colour
 *
 * The accent is indigo — fountain-pen ink — and not by preference: the muster
 * roll needs five distinct status colours, so the brand cannot be green,
 * amber, sky or red without colliding with a status.
 * ---------------------------------------------------------------------- */

export const lightColors = {
  ground: '#F7F6F3',
  surface: '#FFFFFF',
  surfaceSunk: '#EFEEEA',
  rule: '#E4E2DC',
  ruleStrong: '#C8C5BD',
  ink: '#17171A',
  ink2: '#55555E',
  ink3: '#86868F',
  accent: '#2E3A8C',
  accentWash: '#E7E9F5',
} as const;

export const darkColors = {
  ground: '#121214',
  surface: '#1B1B20',
  surfaceSunk: '#25252B',
  rule: '#2C2C33',
  ruleStrong: '#3D3D46',
  ink: '#EDEDF0',
  ink2: '#A6A6B0',
  ink3: '#74747E',
  // Lifted for contrast on a dark ground; not the same indigo as light.
  accent: '#8F9EFF',
  accentWash: '#1E2140',
} as const;

/**
 * Status colours have fixed meanings across the whole app. They are not
 * decorative and must not be reused for emphasis.
 *
 * `neutral` is Absent. A worker being absent is a normal fact, not an error —
 * colouring it red makes the most-used screen in the app read as a list of
 * problems. Deliberate; do not "fix" it.
 */
export const lightStatus = {
  success: '#147A4A',
  warning: '#A2680A',
  info: '#0D6E9E',
  neutral: '#6E6E78',
  danger: '#B3261E',
} as const;

export const darkStatus = {
  success: '#4ECB8B',
  warning: '#E0A93F',
  info: '#5CB8E8',
  neutral: '#8A8A94',
  danger: '#F2857D',
} as const;

export type StatusTone = keyof typeof lightStatus;
export type ColorName = keyof typeof lightColors;

/* -------------------------------------------------------------------------
 * Type
 *
 * System fonts only — SF Pro and Roboto bring Dynamic Type and every
 * accessibility feature for free, and no bundled face survives a user at 200%
 * text size as gracefully. The character comes from how type is set.
 * ---------------------------------------------------------------------- */

export const type = {
  display: { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  title: { fontSize: 22, fontWeight: '600', lineHeight: 28 },
  heading: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 17, fontWeight: '400', lineHeight: 24 },
  secondary: { fontSize: 15, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  /**
   * The ledger's column header, and the single most recognisable detail in the
   * system — used consistently it identifies the app more than a logo would.
   */
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.88, // 0.08em at 11pt
    textTransform: 'uppercase',
  },
} as const;

export type TypeRole = keyof typeof type;

/**
 * Every number in the app. Columns of money must align to the decimal, and a
 * changing figure must not jitter.
 *
 * Deliberately a mutable array: React Native's `TextStyle.fontVariant` is
 * `FontVariant[]`, and a readonly tuple will not assign to it.
 */
export const tabularNums: { fontVariant: 'tabular-nums'[] } = {
  fontVariant: ['tabular-nums'],
};

/** Body text never goes below this, whatever the caller thinks it needs. */
export const MIN_BODY_FONT_SIZE = 15;

/* -------------------------------------------------------------------------
 * Space and shape — 8pt grid
 * ---------------------------------------------------------------------- */

export const space = {
  xs: 4,
  sm: 8,
  /** Within a group. */
  md: 12,
  /** Screen margin. */
  lg: 16,
  /** Between groups. */
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  /** Inputs and buttons. */
  control: 6,
  /** Cards and sheets. */
  surface: 8,
  /** Chips and avatars. */
  full: 999,
} as const;

export const size = {
  /** One row = one event. 64 when the row carries two lines. */
  rowMin: 56,
  rowTwoLine: 64,
  /** The signature element: a 3pt status bar down the left edge of every row. */
  marginRail: 3,
  hairline: 1,
  field: 48,
  /** 44pt iOS / 48dp Android; 48 satisfies both. */
  touchMin: 48,
  /** The muster status control is deliberately larger than the minimum. */
  musterControl: 56,
  icon: 24,
  iconTabBar: 28,
} as const;

/* -------------------------------------------------------------------------
 * Motion (docs/design/motion.md)
 *
 * Nothing on a data-entry path exceeds `standard`. By the hundredth
 * repetition, 300ms feels broken.
 * ---------------------------------------------------------------------- */

export const duration = {
  /** Colour and opacity. */
  instant: 100,
  /** Row states, chips, toggles. */
  quick: 180,
  /** Sheets, entrances. The ceiling for anything on a data-entry path. */
  standard: 240,
  /** Full-screen transitions only. */
  deliberate: 320,
} as const;

export type DurationToken = keyof typeof duration;

/** For anything the finger drove. */
export const spring = { damping: 18, stiffness: 220, mass: 0.6 } as const;

/** Reduce Motion replaces movement with this — it never removes the feedback. */
export const REDUCED_MOTION_DURATION = duration.instant;

/**
 * The one real drop shadow in the app, for the Quick Add button and a bottom
 * sheet. Everywhere else, elevation is a `rule` hairline — borders over
 * shadows is what keeps the ruled-line idea intact.
 */
export const floatingShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.16,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
} as const;

/**
 * A status chip's background is a wash of its own colour rather than a second
 * token, so adding a status cannot forget to add its wash.
 *
 * 12% reads as a surface while staying clear of the margin rail in both themes.
 */
export function statusWash(hex: string, opacity = 0.12): string {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
