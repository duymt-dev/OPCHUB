import type { FormInstance } from 'antd';
import { ApiError } from '@/lib/api-client';
import { z } from 'zod';
import type { LocalIssueTranslator } from '@/i18n/validation';
import { localIssueMessage } from '@/i18n/validation';

/** Only known editable keys are ever mapped to form errors. */
export function profileFormErrors<T>(
  form: FormInstance<T>,
  error: unknown,
  keys: readonly string[],
  fallback: string,
  translate?: LocalIssueTranslator,
) {
  const fields =
    error instanceof z.ZodError
      ? error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: translate ? localIssueMessage(issue, translate) : fallback,
        }))
      : error instanceof ApiError
        ? error.fields
        : [];
  const known = fields.filter((field) => keys.includes(field.path));
  if (known.length) {
    // These forms have flat, whitelisted field names, not arbitrary backend paths.
    form.setFields(
      known.map((field) => ({ name: field.path, errors: [field.message] })) as Parameters<
        FormInstance<T>['setFields']
      >[0],
    );
    return null;
  }
  if (error instanceof ApiError) return error.message;
  if (error instanceof z.ZodError) return fields[0]?.message ?? fallback;
  return fallback;
}
