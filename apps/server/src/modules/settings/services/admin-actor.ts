/** Người thao tác Admin (audit: actor + IP) */
export interface AdminActor {
  id: string;
  ip: string | null;
}
