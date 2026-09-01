import { describe, expect, it } from 'vitest';
import { money, nonNegativeMoney, positiveMoney } from './money.js';

describe('money', () => {
  const valid = ['0', '0.00', '1', '1.5', '1.50', '999999999999.99', '-1.25', '-0.01'];
  const invalid = [
    '1.005', // more than 2 decimal places
    '1000000000000', // 13 integer digits — beyond NUMERIC(14,2)
    '01', // leading zero
    '1.', // trailing point
    '.5', // no integer part
    '1,000', // thousands separator
    '1e3', // exponent notation
    ' 1 ', // whitespace
    '',
    'abc',
    '-0',
    '-0.00',
    'Infinity',
    'NaN',
  ];

  it.each(valid)('accepts %j', (v) => {
    expect(money().safeParse(v).success).toBe(true);
  });

  it.each(invalid)('rejects %j', (v) => {
    expect(money().safeParse(v).success).toBe(false);
  });

  it('rejects a JSON number outright — ADR 0005', () => {
    expect(money().safeParse(1.5).success).toBe(false);
    expect(money().safeParse(0).success).toBe(false);
  });

  it('nonNegativeMoney rejects negatives but allows zero', () => {
    expect(nonNegativeMoney().safeParse('-0.01').success).toBe(false);
    expect(nonNegativeMoney().safeParse('0.00').success).toBe(true);
  });

  it('positiveMoney rejects zero in every spelling', () => {
    for (const zero of ['0', '0.0', '0.00']) {
      expect(positiveMoney().safeParse(zero).success).toBe(false);
    }
    expect(positiveMoney().safeParse('0.01').success).toBe(true);
  });
});
