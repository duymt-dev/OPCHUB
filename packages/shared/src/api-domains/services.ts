import { z } from 'zod';

/** SRS §13 Services — /service-requests, /admin/service-requests/* */

/** glossary + `done` của prototype (RQ_ST) */
export const SERVICE_REQUEST_STATUSES = [
  'new',
  'consulting',
  'quoted',
  'won',
  'lost',
  'done',
] as const;

export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  description: z.string(),
  enabled: z.boolean(),
});
export type Service = z.infer<typeof serviceSchema>;

export const serviceRequestSchema = z.object({
  code: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  requesterType: z.enum(['personal', 'business']),
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  organization: z.string(),
  taxCode: z.string(),
  address: z.string(),
  note: z.string(),
  status: z.enum(SERVICE_REQUEST_STATUSES),
  assignee: z.string().nullable(),
  createdAt: z.string(),
});
export type ServiceRequest = z.infer<typeof serviceRequestSchema>;

export const serviceRequestQuerySchema = z.object({
  status: z.enum(SERVICE_REQUEST_STATUSES).optional(),
});

export const createServiceRequestSchema = z.object({
  serviceId: z.string().min(1),
  requesterType: z.enum(['personal', 'business']),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(20),
  email: z.email(),
  organization: z.string().trim().max(200).default(''),
  taxCode: z.string().trim().max(20).default(''),
  address: z.string().trim().max(200).default(''),
  note: z.string().trim().max(2000).default(''),
});
export type CreateServiceRequest = z.input<typeof createServiceRequestSchema>;

export const updateServiceRequestSchema = z
  .object({
    status: z.enum(SERVICE_REQUEST_STATUSES),
    assignee: z.string().trim().max(100).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Không có trường nào để cập nhật');

export const serviceCommentSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
});
export const createServiceCommentSchema = z.object({ body: z.string().trim().min(1).max(2000) });
