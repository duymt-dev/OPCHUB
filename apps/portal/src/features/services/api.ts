import {
  type CreateServiceRequest,
  requesterProfileSchema,
  serviceRequestSchema,
  serviceSchema,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';

/** SRS §13 Services — GET /services, POST /service-requests; điền sẵn từ GET /me (Q-G3a-2) */

export const serviceKeys = {
  list: ['services'] as const,
  requester: ['me', 'requester'] as const,
};

export const fetchServices = () =>
  api('/services', { schema: z.object({ items: z.array(serviceSchema) }) });

/** Chỉ lấy trường form cần từ hồ sơ đầy đủ */
export const fetchRequester = () => api('/me', { schema: requesterProfileSchema });

export const createServiceRequest = (body: CreateServiceRequest, idempotencyKey: string) =>
  api('/service-requests', {
    method: 'POST',
    body,
    idempotencyKey,
    schema: serviceRequestSchema,
  });
