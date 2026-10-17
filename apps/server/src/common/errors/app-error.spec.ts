import { describe, expect, it } from 'vitest';
import { AppError, codeForStatus } from './app-error';

describe('AppError', () => {
  it('gán HTTP status theo mã', () => {
    expect(new AppError('MEMBERSHIP_REQUIRED', 'x').status).toBe(402);
    expect(new AppError('OTP_INVALID', 'x').status).toBe(422);
  });

  it('suy mã từ status', () => {
    expect(codeForStatus(404)).toBe('NOT_FOUND');
    expect(codeForStatus(503)).toBe('INTERNAL');
    expect(codeForStatus(418)).toBe('VALIDATION_ERROR');
  });
});
