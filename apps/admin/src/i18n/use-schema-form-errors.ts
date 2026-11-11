'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { FormInstance } from 'antd';
import type { ZodError, ZodIssue } from 'zod';
import { useIssueMessage } from './use-issue-message';
import type { IssueMessage } from './use-issue-message';

/** Flat registered fields only: local issues and raw API fields have separate provenance. */
export function useSchemaFormErrors<T>(
  form: FormInstance<T>,
  fields: readonly string[],
  override?: IssueMessage,
) {
  type Name = Parameters<FormInstance<T>['getFieldValue']>[0];
  const message = useIssueMessage(override);
  const local = useRef(new Map<string, { issues: ZodIssue[]; value: unknown }>());
  const raw = useRef(new Map<string, { errors: string[]; value: unknown }>());
  const value = useCallback((name: string): unknown => form.getFieldValue(name as Name), [form]);

  useEffect(() => {
    const validate: Name[] = [];
    for (const field of fields) {
      const name = field as Name;
      const errors = form.getFieldError(name);
      if (!errors.length) {
        local.current.delete(field);
        raw.current.delete(field);
        continue;
      }
      const server = raw.current.get(field);
      if (
        server &&
        Object.is(value(field), server.value) &&
        errors.length === server.errors.length &&
        errors.every((e, i) => e === server.errors[i])
      )
        continue;
      raw.current.delete(field);
      const client = local.current.get(field);
      if (client && Object.is(value(field), client.value)) {
        form.setFields([{ name, errors: client.issues.map(message) }]);
      } else {
        local.current.delete(field);
        validate.push(name);
      }
    }
    // Only currently visible client errors are revalidated. This never invokes onFinish.
    if (validate.length) void form.validateFields(validate).catch(() => undefined);
  }, [fields, form, message, value]);

  const clear = useCallback(() => {
    local.current.clear();
    raw.current.clear();
  }, []);
  const showLocal = useCallback(
    (error: ZodError) => {
      clear();
      for (const field of fields) {
        const issues = error.issues.filter(
          (issue) => issue.path.length === 1 && issue.path[0] === field,
        );
        if (!issues.length) continue;
        local.current.set(field, { issues, value: value(field) });
        form.setFields([{ name: field as Name, errors: issues.map(message) }]);
      }
    },
    [clear, fields, form, message, value],
  );
  const showRaw = useCallback(
    (errors: Readonly<Record<string, string | undefined>>) => {
      clear();
      for (const field of fields) {
        const text = errors[field];
        if (!text) continue;
        raw.current.set(field, { errors: [text], value: value(field) });
        form.setFields([{ name: field as Name, errors: [text] }]);
      }
    },
    [clear, fields, form, value],
  );
  const fieldMessage = useCallback(
    (issue: ZodIssue | undefined, field: string) =>
      message(issue ? { ...issue, path: [field] } : undefined),
    [message],
  );

  return { local: showLocal, raw: showRaw, clear, message: fieldMessage };
}
