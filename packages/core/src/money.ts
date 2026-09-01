import { Decimal } from 'decimal.js';
import type { Money } from '@daybook/contracts';

/**
 * One money implementation, two callers. The muster roll shows a worker their
 * payable wage while the device is offline; the server recomputes the same
 * figure at settlement. Two implementations would eventually disagree, and that
 * disagreement is an argument with a worker about their pay.
 *
 * Values cross every boundary as decimal strings (ADR 0005). `Decimal` exists
 * only between `parseMoney` and `formatMoney` — it is never stored, never
 * serialised, and never handed to a caller.
 */

/** NUMERIC(14,2). ROUND_HALF_EVEN so repeated rounding does not drift upward. */
const money = Decimal.clone({
  precision: 28,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -9e15,
  toExpPos: 9e15,
});

export const MONEY_SCALE = 2;
const MAX_INTEGER_DIGITS = 12;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

const MONEY_PATTERN = /^-?(0|[1-9]\d{0,11})(\.\d{1,2})?$/;

/** "-0" and "-0.00" are rejected here exactly as `money()` rejects them on the
 *  wire — the two spellings must not disagree about what is a valid amount. */
const NEGATIVE_ZERO_PATTERN = /^-0(\.0{1,2})?$/;

/**
 * Parses a wire value. Rejects anything the contract would have rejected, so a
 * value that reaches arithmetic has already been validated twice — the boundary
 * is cheap and a malformed amount here would be silent.
 */
export function parseMoney(value: Money): Decimal {
  if (
    typeof value !== 'string' ||
    !MONEY_PATTERN.test(value) ||
    NEGATIVE_ZERO_PATTERN.test(value)
  ) {
    throw new MoneyError(`Not a valid money string: ${JSON.stringify(value)}`);
  }
  return new money(value);
}

/** Renders back to the canonical wire form: fixed 2dp, no exponent, no "-0". */
export function formatMoney(value: Decimal): Money {
  const rounded = value.toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_EVEN);
  const normalised = rounded.isZero() ? new money(0) : rounded;

  if (normalised.abs().greaterThanOrEqualTo(new money(10).pow(MAX_INTEGER_DIGITS))) {
    throw new MoneyError(`Amount exceeds NUMERIC(14,2): ${normalised.toFixed()}`);
  }
  return normalised.toFixed(MONEY_SCALE);
}

const lift =
  (fn: (a: Decimal, b: Decimal) => Decimal) =>
  (a: Money, b: Money): Money =>
    formatMoney(fn(parseMoney(a), parseMoney(b)));

export const addMoney = lift((a, b) => a.plus(b));
export const subtractMoney = lift((a, b) => a.minus(b));

export function sumMoney(values: readonly Money[]): Money {
  return formatMoney(
    values.reduce<Decimal>((acc, v) => acc.plus(parseMoney(v)), new money(0)),
  );
}

/**
 * Quantity is a plain number — it is a count or a measure, not money, and the
 * float risk that matters is in the total, which is rounded here exactly once.
 */
export function multiplyMoney(amount: Money, quantity: number | string): Money {
  if (typeof quantity === 'number' && !Number.isFinite(quantity)) {
    throw new MoneyError(`Quantity must be finite: ${quantity}`);
  }
  return formatMoney(parseMoney(amount).times(new money(quantity)));
}

export function negateMoney(value: Money): Money {
  return formatMoney(parseMoney(value).negated());
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  return parseMoney(a).comparedTo(parseMoney(b)) as -1 | 0 | 1;
}

export const moneyEquals = (a: Money, b: Money): boolean => compareMoney(a, b) === 0;
export const isZeroMoney = (value: Money): boolean => parseMoney(value).isZero();
export const isNegativeMoney = (value: Money): boolean => parseMoney(value).isNegative();

export const ZERO_MONEY: Money = '0.00';

/**
 * Splits an amount into `parts` shares that sum back to exactly the original.
 * The remaining paisa go to the earliest shares rather than being dropped —
 * a partner settlement that does not reconcile to the paisa is the exact
 * dispute this product exists to prevent.
 */
export function splitMoney(total: Money, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts < 1) {
    throw new MoneyError(`Split count must be a positive integer: ${parts}`);
  }
  const cents = parseMoney(total).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN);
  const base = cents.dividedBy(parts).truncated();
  const remainder = cents.minus(base.times(parts)).toNumber();
  const step = cents.isNegative() ? -1 : 1;

  return Array.from({ length: parts }, (_, i) =>
    formatMoney(base.plus(i < Math.abs(remainder) ? step : 0).dividedBy(100)),
  );
}
