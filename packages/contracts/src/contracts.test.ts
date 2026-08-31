import { describe, expect, it } from 'vitest';
import { errorCodes, httpStatusByErrorCode } from './errors.js';
import { permissionKeys } from './permissions.js';
import { phone } from './common.js';
import { createBusinessSchema } from './business.js';
import { otpVerifySchema } from './auth.js';

describe('error envelope', () => {
  it('maps every error code to a status', () => {
    for (const code of errorCodes) {
      expect(httpStatusByErrorCode[code]).toBeGreaterThanOrEqual(400);
    }
    expect(Object.keys(httpStatusByErrorCode).toSorted()).toEqual(errorCodes.toSorted());
  });

  it('reports a cross-tenant miss as 404, not 403', () => {
    expect(httpStatusByErrorCode.not_found).toBe(404);
    expect(httpStatusByErrorCode.module_disabled).toBe(404);
  });
});

describe('permission catalogue', () => {
  it('has no duplicate keys', () => {
    expect(new Set(permissionKeys).size).toBe(permissionKeys.length);
  });

  it('uses <resource>.<action> naming throughout', () => {
    for (const key of permissionKeys) {
      expect(key).toMatch(/^[a-z]+(\.[a-z]+)+$/);
    }
  });

  it('keeps the sensitive labour actions as their own keys', () => {
    for (const key of [
      'labour.attendance.amend',
      'labour.wages.settle',
      'labour.wages.pay',
      'payments.void',
      'stock.adjust',
      'attachments.delete',
      'members.role.change',
    ] as const) {
      expect(permissionKeys).toContain(key);
    }
  });
});

describe('phone', () => {
  it('accepts E.164 and rejects local formats', () => {
    expect(phone().safeParse('+919876543210').success).toBe(true);
    expect(phone().safeParse('9876543210').success).toBe(false);
    expect(phone().safeParse('+0119876543210').success).toBe(false);
  });
});

describe('createBusiness', () => {
  it('applies INR and Asia/Kolkata defaults', () => {
    const parsed = createBusinessSchema.parse({
      clientUuid: '3f6d2b7a-9c1e-4f8a-b2d4-8e5a1c7f0d93',
      name: 'Pilot Works',
      vertical: 'general',
    });
    expect(parsed.currency).toBe('INR');
    expect(parsed.timezone).toBe('Asia/Kolkata');
  });

  it('requires a client_uuid so an offline retry cannot create two businesses', () => {
    const result = createBusinessSchema.safeParse({
      name: 'Pilot Works',
      vertical: 'general',
    });
    expect(result.success).toBe(false);
  });
});

describe('otpVerify', () => {
  it('requires exactly six digits', () => {
    const base = { phone: '+919876543210' };
    expect(otpVerifySchema.safeParse({ ...base, code: '123456' }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ ...base, code: '12345' }).success).toBe(false);
    expect(otpVerifySchema.safeParse({ ...base, code: '12345a' }).success).toBe(false);
  });
});
