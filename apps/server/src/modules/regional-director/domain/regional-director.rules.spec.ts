import { describe, expect, it } from 'vitest';
import { regionalSqlState } from './regional-director.rules';

describe('regional SQLSTATE compatibility', () => {
  it('accepts legacy and Prisma 7 adapter metadata without masking other errors', () => {
    expect(regionalSqlState({ code: '55P03' })).toBe('55P03');
    expect(regionalSqlState({ driverAdapterError: { cause: { code: '55P03' } } })).toBe('55P03');
    expect(regionalSqlState({ code: '42601' })).toBe('42601');
    expect(regionalSqlState(null)).toBeUndefined();
  });
});
