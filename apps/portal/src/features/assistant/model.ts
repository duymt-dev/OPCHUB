/** Trạng thái đóng / mở khung Trợ lý nhớ theo trình duyệt (như `opc-sb-mini` của sidebar) */
export const ASSISTANT_OPEN_KEY = 'opc-assistant-open';

export function readOpen(storage: Pick<Storage, 'getItem'> | undefined): boolean {
  try {
    return storage?.getItem(ASSISTANT_OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeOpen(storage: Pick<Storage, 'setItem'> | undefined, open: boolean): void {
  try {
    storage?.setItem(ASSISTANT_OPEN_KEY, open ? '1' : '0');
  } catch {
    // trình duyệt chặn storage: chỉ mất phần nhớ, khung vẫn đóng / mở được
  }
}

/** Accordion một mục (prototype `svAc`): bấm mục đang mở → đóng */
export const nextAccordion = (current: string | null, id: string): string | null =>
  current === id ? null : id;
