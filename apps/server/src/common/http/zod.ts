import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { z } from 'zod';

/**
 * Parse input HTTP bằng zod schema của `@opchub/shared` (luật 2: dữ liệu ngoài vào qua zod).
 * Lỗi ZodError → filter trả 400 VALIDATION_ERROR có `fields`.
 *
 *   create(@ZodBody(schema) body: z.infer<typeof schema>)
 *
 * Schema được bọc `{ schema }` vì zod 4 có `transform()` nên Nest sẽ nhầm nó là pipe.
 */
type Part = 'body' | 'query' | 'params';

const factory = createParamDecorator(
  (data: { part: Part; schema: z.ZodType }, ctx: ExecutionContext): unknown => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return data.schema.parse(req[data.part] ?? {});
  },
);

export const ZodBody = (schema: z.ZodType) => factory({ part: 'body', schema });
export const ZodQuery = (schema: z.ZodType) => factory({ part: 'query', schema });
export const ZodParams = (schema: z.ZodType) => factory({ part: 'params', schema });

/** Serialize output qua schema hợp đồng — không để lọt trường thừa (passwordHash, isSimulated…) */
export const respond = <S extends z.ZodType>(schema: S, data: z.input<S>): z.infer<S> =>
  schema.parse(data);
