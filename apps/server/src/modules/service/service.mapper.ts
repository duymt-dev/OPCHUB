import type { ServiceRequest } from '@opchub/shared/api-domains';
import { z } from 'zod';

export const REQUEST_SELECT = {
  code: true,
  serviceId: true,
  requesterType: true,
  fullName: true,
  phone: true,
  email: true,
  organization: true,
  taxCode: true,
  address: true,
  note: true,
  status: true,
  assignee: true,
  details: true,
  createdAt: true,
  service: { select: { name: true } },
} as const;

export interface RequestRow {
  code: string;
  serviceId: string;
  requesterType: ServiceRequest['requesterType'];
  fullName: string;
  phone: string;
  email: string;
  organization: string;
  taxCode: string;
  address: string;
  note: string;
  status: ServiceRequest['status'];
  assignee: string | null;
  details: unknown;
  createdAt: Date;
  service: { name: string };
}

const detailsSchema = z.record(z.string(), z.string());

export function toRequest(r: RequestRow): ServiceRequest {
  const d = detailsSchema.safeParse(r.details);
  return {
    code: r.code,
    serviceId: r.serviceId,
    serviceName: r.service.name,
    requesterType: r.requesterType,
    fullName: r.fullName,
    phone: r.phone,
    email: r.email,
    organization: r.organization,
    taxCode: r.taxCode,
    address: r.address,
    note: r.note,
    status: r.status,
    assignee: r.assignee,
    createdAt: r.createdAt.toISOString(),
    ...(d.success ? { details: d.data } : {}),
  };
}

export const STATUS_LABEL: Record<ServiceRequest['status'], string> = {
  new: 'Mới đăng ký',
  consulting: 'Đang tư vấn',
  quoted: 'Đã báo giá',
  won: 'Đã chốt',
  lost: 'Từ chối',
  done: 'Hoàn thành',
};
