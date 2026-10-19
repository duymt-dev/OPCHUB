import type { Request } from 'express';
import type { AccessClaims } from '@/common/auth';

/** Người thao tác Admin (audit: actor + IP) */
export interface AdminActor {
  id: string;
  ip: string | null;
}

export const actorOf = (u: AccessClaims, req: Request): AdminActor => ({
  id: u.sub,
  ip: req.ip ?? null,
});

export const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002';
