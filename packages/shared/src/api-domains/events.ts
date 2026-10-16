import { z } from 'zod';
import { eventSummarySchema } from '../api';

/** SRS §13 Events — /events, /events/:id/registration, /admin/events/* */

export const eventQuerySchema = z.object({ mode: z.enum(['online', 'offline']).optional() });

export const eventItemSchema = eventSummarySchema.extend({
  startsAt: z.string(),
  address: z.string().nullable(),
  registeredByMe: z.boolean(),
});
export type EventItem = z.infer<typeof eventItemSchema>;

export const eventRegistrationResultSchema = z.object({
  eventId: z.string(),
  registered: z.number().int(),
  registeredByMe: z.boolean(),
});
export type EventRegistrationResult = z.infer<typeof eventRegistrationResultSchema>;

export const eventUpsertSchema = z.object({
  title: z.string().trim().min(3).max(200),
  mode: z.enum(['online', 'offline']),
  startsAt: z.iso.datetime(),
  place: z.string().trim().min(1),
  address: z.string().trim().optional(),
  seats: z.number().int().min(1).max(100000),
  description: z.string().trim().max(5000),
});
export type EventUpsert = z.infer<typeof eventUpsertSchema>;

export const eventRegistrationRowSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  status: z.enum(['registered', 'attended', 'cancelled']),
  registeredAt: z.string(),
});
export type EventRegistrationRow = z.infer<typeof eventRegistrationRowSchema>;
