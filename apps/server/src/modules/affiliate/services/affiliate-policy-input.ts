import { z } from 'zod';
import { affiliatePolicySchema } from '@opchub/shared/api-domains';
import { AppError } from '@/common/errors';
class RenewalPolicyError extends AppError {
  override readonly status = 422;
}
/** Preserve legacy 400 input errors; D-131 specifies 422 for the new renewal controls. */
export const affiliatePolicyInputSchema = z.unknown().transform((input) => {
  const parsed = affiliatePolicySchema.safeParse(input);
  if (parsed.success) return parsed.data;
  if (
    parsed.error.issues.every((i) => i.path[0] === 'renewalRate' || i.path[0] === 'renewalMaxYear')
  )
    throw new RenewalPolicyError(
      'VALIDATION_ERROR',
      'Chính sách gia hạn không hợp lệ',
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  throw parsed.error;
});
