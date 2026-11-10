import type { FormInstance } from 'antd';
import { ApiError } from '@/lib/api-client';
import { z } from 'zod';

/** Only known editable keys are ever mapped to form errors. */
export function profileFormErrors<T>(
  form: FormInstance<T>,
  error: unknown,
  keys: readonly string[],
  fallback: string,
) {
  const fields =
    error instanceof z.ZodError
      ? error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
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
  return error instanceof Error ? error.message : fallback;
}
