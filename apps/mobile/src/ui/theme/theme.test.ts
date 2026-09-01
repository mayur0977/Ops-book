import { describe, expect, it } from 'vitest';
import {
  darkColors,
  darkStatus,
  lightColors,
  lightStatus,
  duration,
  radius,
  size,
  space,
  tabularNums,
  type as typeScale,
  MIN_BODY_FONT_SIZE,
  REDUCED_MOTION_DURATION,
  statusWash,
} from './tokens';

/**
 * The design system says "Contrast: 4.5:1 text, 3:1 UI. Verify in both themes."
 * Verifying by eye is a thing you do once; this does it on every commit.
 *
 * These screens are read in direct sunlight and in dim workshops, so the
 * contrast floor is a functional requirement, not a compliance checkbox.
 */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const r = channel(Number.parseInt(v.slice(0, 2), 16));
  const g = channel(Number.parseInt(v.slice(2, 4), 16));
  const b = channel(Number.parseInt(v.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

const themes = [
  { name: 'light', color: lightColors, status: lightStatus },
  { name: 'dark', color: darkColors, status: darkStatus },
] as const;

describe.each(themes)('$name theme contrast', ({ color, status }) => {
  it.each(['ink', 'ink2'] as const)('%s reaches 4.5:1 on surface', (token) => {
    expect(contrast(color[token], color.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['ink', 'ink2'] as const)('%s reaches 4.5:1 on ground', (token) => {
    expect(contrast(color[token], color.ground)).toBeGreaterThanOrEqual(4.5);
  });

  it('ink3 reaches 3:1 — it is placeholder and label text, never body', () => {
    expect(contrast(color.ink3, color.surface)).toBeGreaterThanOrEqual(3);
  });

  it('accent reaches 4.5:1 on surface, since links and actions use it', () => {
    expect(contrast(color.accent, color.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(Object.keys(lightStatus) as (keyof typeof lightStatus)[])(
    'status %s reaches 4.5:1 on surface',
    (tone) => {
      expect(contrast(status[tone], color.surface)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('the rule hairline is visible against its surface', () => {
    // It is the strongest recurring element in the interface; if it disappears
    // the whole ledger structure goes with it.
    expect(contrast(color.rule, color.surface)).toBeGreaterThan(1.05);
    expect(contrast(color.ruleStrong, color.surface)).toBeGreaterThan(
      contrast(color.rule, color.surface),
    );
  });
});

describe('token integrity', () => {
  it('every light colour has a dark counterpart', () => {
    expect(Object.keys(darkColors).toSorted()).toEqual(
      Object.keys(lightColors).toSorted(),
    );
  });

  it('every status exists in both themes', () => {
    expect(Object.keys(darkStatus).toSorted()).toEqual(
      Object.keys(lightStatus).toSorted(),
    );
  });

  it('the five status meanings are exactly the ones the muster roll needs', () => {
    expect(Object.keys(lightStatus).toSorted()).toEqual([
      'danger',
      'info',
      'neutral',
      'success',
      'warning',
    ]);
  });

  it('the accent is not one of the status colours', () => {
    // The muster roll needs five distinct status colours, so the brand cannot
    // be green, amber, sky or red without colliding with a meaning.
    const statuses = new Set<string>([
      ...Object.values(lightStatus),
      ...Object.values(darkStatus),
    ]);
    expect(statuses.has(lightColors.accent)).toBe(false);
    expect(statuses.has(darkColors.accent)).toBe(false);
  });

  it('absent is grey, never red', () => {
    // Deliberate. Colouring a normal fact red makes the most-used screen in the
    // app read as a list of problems.
    expect(lightStatus.neutral).not.toBe(lightStatus.danger);
    expect(contrast(lightStatus.neutral, lightStatus.danger)).toBeGreaterThan(1);
  });
});

describe('type scale', () => {
  it('never sets body text below the legibility floor', () => {
    for (const role of ['body', 'secondary', 'heading', 'title', 'display'] as const) {
      expect(typeScale[role].fontSize).toBeGreaterThanOrEqual(MIN_BODY_FONT_SIZE);
    }
  });

  it('label is the ledger column header: 11pt, uppercase, letterspaced', () => {
    expect(typeScale.label.fontSize).toBe(11);
    expect(typeScale.label.textTransform).toBe('uppercase');
    expect(typeScale.label.letterSpacing).toBeCloseTo(0.88, 2);
  });

  it('gives every number tabular figures', () => {
    expect(tabularNums.fontVariant).toEqual(['tabular-nums']);
  });
});

describe('space, shape and motion', () => {
  it('keeps every spacing step on the 8pt grid or its half', () => {
    for (const value of Object.values(space)) expect(value % 4).toBe(0);
  });

  it('meets the 44pt iOS / 48dp Android touch minimum', () => {
    expect(size.touchMin).toBeGreaterThanOrEqual(48);
    expect(size.musterControl).toBeGreaterThan(size.touchMin);
  });

  it('keeps rounding modest, so it does not fight the ruled-line idea', () => {
    expect(radius.control).toBeLessThanOrEqual(8);
    expect(radius.surface).toBeLessThanOrEqual(8);
  });

  it('caps data-entry motion at 240ms', () => {
    // By the hundredth repetition, 300ms feels broken.
    expect(duration.standard).toBeLessThanOrEqual(240);
    expect(duration.instant).toBeLessThan(duration.quick);
    expect(duration.quick).toBeLessThan(duration.standard);
  });

  it('replaces motion rather than removing it under Reduce Motion', () => {
    expect(REDUCED_MOTION_DURATION).toBe(duration.instant);
    expect(REDUCED_MOTION_DURATION).toBeGreaterThan(0);
  });
});

describe('statusWash', () => {
  it('derives a wash from the status colour itself', () => {
    expect(statusWash('#147A4A')).toBe('rgba(20, 122, 74, 0.12)');
  });

  it('accepts a custom opacity', () => {
    expect(statusWash('#FFFFFF', 0.4)).toBe('rgba(255, 255, 255, 0.4)');
  });
});
