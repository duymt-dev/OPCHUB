import type { GroupDetail, Persona } from '@opchub/shared/api-domains';

export const PREFIX = 'tip824-i18n-';
export interface OwnedValues {
  group: GroupDetail;
  persona: Persona;
}
export function requireOwned(name: string): void {
  if (!name.startsWith(PREFIX)) throw new Error('Refusing non-owned canonical fixture');
}
export const PRESETS = {
  tone: 'Chuyên gia, trả lời chi tiết',
  gender: 'Nữ',
  ageRange: '35 – 44',
  activeHours: 'Cả ngày',
} as const;
