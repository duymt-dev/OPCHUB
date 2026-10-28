import { type AdminRoom, DEFAULT_ROOM_KEYS, type DefaultRoomKey } from '@opchub/shared/api-domains';
import type { Dispatch, SetStateAction } from 'react';
import type { TopicCallbacks } from './hooks/use-group-topics';
import type { GroupFormState } from './types';

const isDefaultKey = (k: string): k is DefaultRoomKey =>
  (DEFAULT_ROOM_KEYS as readonly string[]).includes(k);

const same = (a: string, b: string) => a.toLocaleLowerCase('vi') === b.toLocaleLowerCase('vi');

/** Phòng tự đặt tên đổi tên → đổi theo trong bản nháp (khớp theo tên cũ) */
export function renameInForm(
  f: GroupFormState,
  before: AdminRoom,
  after: AdminRoom,
): GroupFormState {
  if (isDefaultKey(before.key)) return f;
  return {
    ...f,
    extraRooms: f.extraRooms.map((x) =>
      same(x.name.trim(), before.name) ? { name: after.name, description: after.description } : x,
    ),
  };
}

/**
 * Chủ đề đã xoá → bỏ khỏi bản nháp, để "Lưu thay đổi" không gửi lại (server thêm lại phòng tự đặt tên cùng tên
 * vì tên của chủ đề đã xoá được dùng lại — D-111).
 */
export function dropFromForm(f: GroupFormState, room: AdminRoom): GroupFormState {
  if (isDefaultKey(room.key)) return { ...f, rooms: f.rooms.filter((k) => k !== room.key) };
  return { ...f, extraRooms: f.extraRooms.filter((x) => !same(x.name.trim(), room.name)) };
}

export const topicSync = (setF: Dispatch<SetStateAction<GroupFormState>>): TopicCallbacks => ({
  onRenamed: (before, after) => setF((f) => renameInForm(f, before, after)),
  onDeleted: (room) => setF((f) => dropFromForm(f, room)),
});
