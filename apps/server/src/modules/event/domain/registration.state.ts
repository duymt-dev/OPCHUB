import type { EventRegistrationStatus } from '@opchub/db';

/**
 * Máy trạng thái đăng ký sự kiện (SRS §9, BUG-041):
 * - Cạnh §9: Đã đăng ký → Đã tham dự (EV-R05 check-in) | Đã hủy.
 * - Cạnh mở rộng có lý do (khai báo rõ, không thêm cạnh khác):
 *   `cancelled → registered` — NA-23 "Hủy đăng ký trả lại chỗ" + UP-04 Đăng ký/Hủy (cùng dòng PK),
 *   chỉ khi đăng ký còn mở và sự kiện chưa bắt đầu;
 *   `attended → registered` — Admin bỏ check-in nhầm (audit `event.check_in_undo`),
 *   chỉ trước khi sự kiện kết thúc.
 * - Bị chặn: `attended → cancelled`, `cancelled → attended`.
 */
export const REGISTRATION_TRANSITIONS: Record<
  EventRegistrationStatus,
  readonly EventRegistrationStatus[]
> = {
  registered: ['attended', 'cancelled'],
  attended: ['registered'],
  cancelled: ['registered'],
};

export const canTransitionRegistration = (
  from: EventRegistrationStatus,
  to: EventRegistrationStatus,
): boolean => REGISTRATION_TRANSITIONS[from].includes(to);

/** Một cạnh: `from` dùng cho `WHERE status = from` (luật 7) */
export interface RegistrationEdge {
  from: EventRegistrationStatus;
  to: EventRegistrationStatus;
}

export function registrationEdge(
  from: EventRegistrationStatus,
  to: EventRegistrationStatus,
): RegistrationEdge {
  if (!canTransitionRegistration(from, to)) {
    throw new Error(`Cạnh đăng ký sự kiện không hợp lệ: ${from} → ${to}`);
  }
  return { from, to };
}

/** Không có giờ kết thúc → coi sự kiện kéo dài 24 giờ từ lúc bắt đầu (V2Q-102) */
const DEFAULT_SPAN_MS = 24 * 60 * 60 * 1000;

export const eventEndsAt = (startsAt: Date, endsAt: Date | null): Date =>
  endsAt ?? new Date(startsAt.getTime() + DEFAULT_SPAN_MS);

/** Điều kiện cạnh mở rộng `cancelled → registered` (NA-23) */
export const canReRegister = (ev: { registrationOpen: boolean; startsAt: Date }, now: Date) =>
  ev.registrationOpen && ev.startsAt.getTime() > now.getTime();

/** Điều kiện cạnh mở rộng `attended → registered` (bỏ check-in nhầm) */
export const canUndoCheckIn = (ev: { startsAt: Date; endsAt: Date | null }, now: Date) =>
  eventEndsAt(ev.startsAt, ev.endsAt).getTime() > now.getTime();
