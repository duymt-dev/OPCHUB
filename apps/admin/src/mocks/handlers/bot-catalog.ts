import { personaUpsertSchema, scriptUpsertSchema } from '@opchub/shared/api-domains';
import {
  mockDb,
  personaCrud,
  personaFromInput,
  scriptCrud,
  scriptFromInput,
  type MockResult,
} from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import type { z } from 'zod';
import { mockAdminGuard } from './admin-guard';
import { botMutationReply, botWriteGuard, parseBotBody } from './bot-handler-utils';
import { param } from './domain-util';
import { API } from './util';

function catalogRoutes<S extends z.ZodType, T extends { id: string }>(
  path: string,
  entity: 'persona' | 'script',
  schema: S,
  list: () => T[],
  crud: {
    create: (input: z.output<S>) => MockResult<T>;
    update: (id: string, input: z.output<S>) => MockResult<T>;
    remove: (id: string) => MockResult<{ id: string }>;
  },
) {
  return [
    http.get(
      `${API}${path}`,
      ({ request }) => mockAdminGuard(request, 'bots.view') ?? HttpResponse.json({ items: list() }),
    ),
    http.post(`${API}${path}`, async ({ request }) => {
      const denied = await botWriteGuard(request);
      if (denied) return denied;
      const parsed = await parseBotBody(request, schema);
      if (!parsed.ok) return parsed.res;
      const result = crud.create(parsed.data);
      const id = result.ok ? result.data.id : '';
      return botMutationReply(
        request,
        result,
        `${entity}.create`,
        entity,
        id,
        `Thêm ${entity} ${id}`,
        201,
      );
    }),
    http.patch(`${API}${path}/:id`, async ({ request, params }) => {
      const denied = await botWriteGuard(request);
      if (denied) return denied;
      const parsed = await parseBotBody(request, schema);
      if (!parsed.ok) return parsed.res;
      const id = param(params, 'id');
      return botMutationReply(
        request,
        crud.update(id, parsed.data),
        `${entity}.update`,
        entity,
        id,
        `Cập nhật ${entity} ${id}`,
      );
    }),
    http.delete(`${API}${path}/:id`, async ({ request, params }) => {
      const denied = await botWriteGuard(request);
      if (denied) return denied;
      const id = param(params, 'id');
      return botMutationReply(
        request,
        crud.remove(id),
        `${entity}.delete`,
        entity,
        id,
        `Xoá ${entity} ${id}`,
      );
    }),
  ];
}

const normalizeScript = (input: z.output<typeof scriptUpsertSchema>) =>
  scriptFromInput({ ...input, groupIds: [...new Set(input.groupIds)] });

export const botCatalogHandlers = [
  ...catalogRoutes('/admin/personas', 'persona', personaUpsertSchema, () => mockDb().personas, {
    create: (input) => personaCrud.create(personaFromInput(input)),
    update: (id, input) => personaCrud.update(id, input),
    remove: (id) => personaCrud.remove(id),
  }),
  ...catalogRoutes('/admin/scripts', 'script', scriptUpsertSchema, () => mockDb().scripts, {
    create: (input) => scriptCrud.create(normalizeScript(input)),
    update: (id, input) => scriptCrud.update(id, normalizeScript(input)),
    remove: (id) => scriptCrud.remove(id),
  }),
];
