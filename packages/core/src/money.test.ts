import { describe, expect, it } from 'vitest';
import {
  ZERO_MONEY,
  addMoney,
  compareMoney,
  isNegativeMoney,
  isZeroMoney,
  moneyEquals,
  MoneyError,
  multiplyMoney,
  negateMoney,
  splitMoney,
  subtractMoney,
  sumMoney,
} from './money.js';

describe('money arithmetic', () => {
  it('does not drift the way floats do', () => {
    expect(addMoney('0.10', '0.20')).toBe('0.30');
    expect(0.1 + 0.2).not.toBe(0.3); // the reason this module exists
  });

  it('always returns canonical 2dp strings', () => {
    expect(addMoney('1', '2')).toBe('3.00');
    expect(addMoney('1.5', '0')).toBe('1.50');
    expect(subtractMoney('5', '5')).toBe('0.00');
  });

  it('never returns negative zero', () => {
    expect(subtractMoney('0.00', '0.00')).toBe('0.00');
    expect(negateMoney('0.00')).toBe('0.00');
    expect(multiplyMoney('0.00', -3)).toBe('0.00');
  });

  it('subtracts into negatives', () => {
    expect(subtractMoney('100.00', '150.50')).toBe('-50.50');
    expect(isNegativeMoney('-50.50')).toBe(true);
  });

  it('sums a long list without accumulating error', () => {
    const hundredPaise = Array.from({ length: 100 }, () => '0.01');
    expect(sumMoney(hundredPaise)).toBe('1.00');
    expect(sumMoney([])).toBe(ZERO_MONEY);
  });

  it('rounds a multiplication exactly once, half to even', () => {
    expect(multiplyMoney('0.15', 0.5)).toBe('0.08'); // 0.075 -> 0.08
    expect(multiplyMoney('0.25', 0.5)).toBe('0.12'); // 0.125 -> 0.12 (ties to even)
    expect(multiplyMoney('450.00', 26)).toBe('11700.00'); // a month of daily wage
  });

  it('accepts a decimal-string quantity', () => {
    expect(multiplyMoney('100.00', '2.5')).toBe('250.00');
  });

  it('compares without parsing to a float', () => {
    expect(compareMoney('1.10', '1.9')).toBe(-1);
    expect(compareMoney('2.00', '2')).toBe(0);
    expect(moneyEquals('1.5', '1.50')).toBe(true);
    expect(isZeroMoney('0')).toBe(true);
  });
});

describe('money validation', () => {
  it.each(['1.005', '1e3', '', '1,000', 'abc', '-0'])('rejects %j', (v) => {
    expect(() => addMoney(v, '0')).toThrow(MoneyError);
  });

  it('rejects a JS number at the boundary', () => {
    // @ts-expect-error — the contract says string; this guards the runtime too
    expect(() => addMoney(1.5, '0')).toThrow(MoneyError);
  });

  it('refuses to produce a value NUMERIC(14,2) could not store', () => {
    expect(() => multiplyMoney('999999999999.99', 2)).toThrow(MoneyError);
  });

  it('rejects a non-finite quantity', () => {
    expect(() => multiplyMoney('1.00', Number.POSITIVE_INFINITY)).toThrow(MoneyError);
    expect(() => multiplyMoney('1.00', Number.NaN)).toThrow(MoneyError);
  });
});

describe('splitMoney', () => {
  it('always sums back to the original — no paisa is ever dropped', () => {
    for (const [total, parts] of [
      ['100.00', 3],
      ['0.01', 3],
      ['10.00', 7],
      ['-100.00', 3],
      ['999.99', 11],
    ] as const) {
      const shares = splitMoney(total, parts);
      expect(shares).toHaveLength(parts);
      expect(sumMoney(shares)).toBe(sumMoney([total]));
    }
  });

  it('gives the remainder to the earliest shares', () => {
    expect(splitMoney('100.00', 3)).toEqual(['33.34', '33.33', '33.33']);
    expect(splitMoney('10.00', 4)).toEqual(['2.50', '2.50', '2.50', '2.50']);
  });

  it('rejects a nonsensical part count', () => {
    expect(() => splitMoney('10.00', 0)).toThrow(MoneyError);
    expect(() => splitMoney('10.00', 2.5)).toThrow(MoneyError);
  });
});
