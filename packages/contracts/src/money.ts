import { z } from 'zod';

/**
 * Money on the wire is a decimal STRING, never a JSON number (ADR 0005).
 *
 * The shape mirrors the storage type exactly: NUMERIC(14,2) is 14 significant
 * digits with 2 after the point, so at most 12 before it. Validating the same
 * bound the database enforces means an over-long amount is a 422 at the edge
 * rather than a 500 from Postgres.
 */
const MONEY_PATTERN = /^-?(0|[1-9]\d{0,11})(\.\d{1,2})?$/;

export const MONEY_MAX_INTEGER_DIGITS = 12;
export const MONEY_SCALE = 2;

export const money = () =>
  z
    .string()
    .regex(MONEY_PATTERN, 'Must be a decimal amount with at most 2 decimal places')
    .refine(
      (v) => v !== '-0' && !/^-0(\.0{1,2})?$/.test(v),
      'Negative zero is not a valid amount',
    );

/** An amount that may not be negative — a payment, an expense, a wage rate. */
export const nonNegativeMoney = () =>
  money().refine((v) => !v.startsWith('-'), 'Must not be negative');

/** An amount that must be strictly greater than zero. */
export const positiveMoney = () =>
  nonNegativeMoney().refine(
    (v) => !/^0(\.0{1,2})?$/.test(v),
    'Must be greater than zero',
  );

export type Money = string;
