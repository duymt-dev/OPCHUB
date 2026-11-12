import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { regionalBankSchema } from '@opchub/shared/api-domains';
import { localIssueMessage, type LocalIssueTranslator } from './validation';

const translate: LocalIssueTranslator = (key, values) => `${key}:${JSON.stringify(values ?? {})}`;
function message(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success || !result.error.issues[0]) throw new Error('Expected rejected fixture');
  return localIssueMessage(result.error.issues[0], translate);
}

describe('AC824-10 client-only schema issue classification', () => {
  it('uses structured numeric predicates rather than English Zod defaults', () => {
    expect(message(z.number().int(), 1.5)).toBe('integer:{}');
    expect(message(z.number().min(1), 0)).toBe('minNumber:{"min":1}');
    expect(message(z.number().max(10000000000), 10000000001)).toBe('maxNumber:{"max":10000000000}');
  });
  it('does not misrepresent exclusive bounds or arbitrary custom issues', () => {
    expect(message(z.number().gt(1), 1)).toBe('invalid:{}');
    expect(message(z.number().lt(1), 1)).toBe('invalid:{}');
    expect(
      message(
        z.string().refine(() => false, 'User text'),
        'draft',
      ),
    ).toBe('invalid:{}');
  });
  it.each(['12', '12x3456', '123456789012345678901'])(
    'classifies rejected bank number %s',
    (bankNo) => {
      expect(
        message(regionalBankSchema, { bankName: 'Bank', bankNo, bankHolder: 'NGUYEN AN' }),
      ).toBe('bankAccountNumber:{}');
    },
  );
  it('retains shared bank normalization and rejects non-letter holders', () => {
    expect(
      message(regionalBankSchema, { bankName: 'Bank', bankNo: '123456', bankHolder: 'An123' }),
    ).toBe('bankHolderLetters:{}');
    expect(
      regionalBankSchema.parse({ bankName: ' Bank ', bankNo: '123 456', bankHolder: ' Đặng  An ' }),
    ).toEqual({ bankName: 'Bank', bankNo: '123 456', bankHolder: 'DANG AN' });
  });
});
