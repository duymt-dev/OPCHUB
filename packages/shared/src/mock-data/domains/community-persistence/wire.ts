import { z } from 'zod';

export const wireId = z.string().min(1);
export const wireCount = z.number().int().nonnegative();
export const wireEntries = <T extends z.ZodType>(value: T) =>
  z
    .array(z.tuple([wireId, value]))
    .refine((rows) => new Set(rows.map(([key]) => key)).size === rows.length, {
      message: 'Duplicate persisted map key',
    });
