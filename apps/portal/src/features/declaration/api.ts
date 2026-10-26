import { type DeclarationRequest, declarationDraftSchema, meSchema } from '@opchub/shared/api';
import { api } from '@/lib/api-client';

/** V4-607 `GET/PUT /me/declaration` */
export const declarationKeys = { draft: ['me', 'declaration'] as const };

export const fetchDeclarationDraft = () =>
  api('/me/declaration', { schema: declarationDraftSchema });

export const saveDeclaration = (body: DeclarationRequest) =>
  api('/me/declaration', { method: 'PUT', body, schema: meSchema });
