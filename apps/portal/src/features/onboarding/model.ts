import type { Onboarding, OnboardingKey } from '@opchub/shared/api-domains';

/** Trạng thái hiển thị của một bước (prototype `_dash`): xong / kế tiếp (tô xanh) / chưa / khoá */
export type StepState = 'done' | 'next' | 'todo' | 'locked';

export interface StepRow {
  key: OnboardingKey;
  n: number;
  state: StepState;
}

/** Bước kế tiếp = bước đầu tiên chưa xong và không khoá */
export function stepRows(o: Onboarding): StepRow[] {
  let nextSet = false;
  return o.steps.map((s, i) => {
    const isNext = !s.done && !s.locked && !nextSet;
    if (isNext) nextSet = true;
    const state: StepState = s.done ? 'done' : s.locked ? 'locked' : isNext ? 'next' : 'todo';
    return { key: s.key, n: i + 1, state };
  });
}

export const progressPct = (o: Onboarding) => Math.round((o.done / o.total) * 100);

export type DayPart = 'morning' | 'noon' | 'afternoon' | 'evening';

/** Lời chào theo giờ (prototype: < 11 sáng, < 14 trưa, < 18 chiều, còn lại tối) */
export const dayPartOf = (hour: number): DayPart =>
  hour < 11 ? 'morning' : hour < 14 ? 'noon' : hour < 18 ? 'afternoon' : 'evening';

const VN_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  hourCycle: 'h23',
});
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Thứ (0 = Chủ Nhật), "dd/mm/yyyy" và giờ theo giờ Việt Nam */
export function vnClock(ms: number): { dow: number; date: string; hour: number } {
  const p = Object.fromEntries(VN_PARTS.formatToParts(ms).map((x) => [x.type, x.value]));
  return {
    dow: Math.max(0, WEEKDAYS.indexOf(p.weekday ?? '')),
    date: `${p.day ?? ''}/${p.month ?? ''}/${p.year ?? ''}`,
    hour: Number(p.hour ?? 0),
  };
}

/** Tên gọi trong lời chào: từ cuối của họ tên ("Nguyễn Văn An" → "An") */
export const firstNameOf = (fullName: string) => fullName.trim().split(/\s+/).pop() ?? fullName;
