'use client';

import { useState } from 'react';

export type LocalErrorText<Code extends string> =
  { kind: 'local'; code: Code } | { kind: 'raw'; message: string };

/** Error provenance is explicit: an API string can never become a client translation key. */
export function useLocalErrors<Field extends string, Code extends string>(
  translate: (code: Code) => string,
  initial: Partial<Record<Field, LocalErrorText<Code>>> = {},
) {
  const [values, setValues] = useState(initial);
  const errors: Partial<Record<Field, string>> = {};
  for (const field of Object.keys(values) as Field[]) {
    const value = values[field];
    if (value) errors[field] = value.kind === 'local' ? translate(value.code) : value.message;
  }

  const local = (next: Partial<Record<Field, Code>>) => {
    const mapped: Partial<Record<Field, LocalErrorText<Code>>> = {};
    for (const field of Object.keys(next) as Field[]) {
      const code = next[field];
      if (code !== undefined) mapped[field] = { kind: 'local', code };
    }
    setValues(mapped);
  };
  const raw = (next: Partial<Record<Field, string>>) => {
    const mapped: Partial<Record<Field, LocalErrorText<Code>>> = {};
    for (const field of Object.keys(next) as Field[]) {
      const message = next[field];
      if (message !== undefined) mapped[field] = { kind: 'raw', message };
    }
    setValues(mapped);
  };
  return { errors, local, raw, clear: () => setValues({}) };
}
