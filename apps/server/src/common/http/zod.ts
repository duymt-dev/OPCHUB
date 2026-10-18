import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { z } from 'zod';
import { parseClean } from '../html/sanitize-input';

/**
 * Parse input HTTP bằng zod schema của `@opchub/shared` (luật 2: dữ liệu ngoài vào qua zod).
 * Lỗi ZodError → filter trả 400 VALIDATION_ERROR có `fields`.
 *
 *   create(@ZodBody(schema, { rich: ['description'] }) body: z.infer<typeof schema>)
 *
 * Body được làm sạch SAU zod (NA-27): trường `rich` lọc theo allowlist, chuỗi khác bỏ thẻ HTML;
 * `raw: true` tắt (chỉ dev-bank). Schema được bọc `{ schema }` vì zod 4 có `transform()` nên Nest
 * sẽ nhầm nó là pipe.
 */
type Part = 'body' | 'query' | 'params';

export interface ZodBodyOptions {
  /** Đường dẫn trường rich text (`description`, `lines.*.body`) */
  rich?: readonly string[];
  /** Không làm sạch — chỉ cho endpoint giả lập/kỹ thuật */
  raw?: boolean;
}

interface Data {
  part: Part;
  schema: z.ZodType;
  opts?: ZodBodyOptions;
}

const factory = createParamDecorator((data: Data, ctx: ExecutionContext): unknown => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const input: unknown = req[data.part] ?? {};
  if (data.part !== 'body' || data.opts?.raw) return data.schema.parse(input);
  return parseClean(data.schema, input, { rich: data.opts?.rich });
});

export const ZodBody = (schema: z.ZodType, opts?: ZodBodyOptions) =>
  factory({ part: 'body', schema, ...(opts ? { opts } : {}) });
export const ZodQuery = (schema: z.ZodType) => factory({ part: 'query', schema });
export const ZodParams = (schema: z.ZodType) => factory({ part: 'params', schema });

/** Serialize output qua schema hợp đồng — không để lọt trường thừa (passwordHash, isSimulated…) */
export const respond = <S extends z.ZodType>(schema: S, data: z.input<S>): z.infer<S> =>
  schema.parse(data);
