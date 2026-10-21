export const moderationWarningId = (reportId: string) => `moderation-warn-${reportId}`;

export function moderationWarningContent(room: {
  name: string;
  groupId: string;
  slug: string;
  isDefault: boolean;
}) {
  return {
    type: 'group' as const,
    title: 'Tin nhắn của bạn vi phạm nội quy nhóm',
    body: `Quản trị viên đã cảnh báo một tin nhắn của bạn trong #${room.name}. Vui lòng xem lại nội quy.`,
    link: room.isDefault ? `/chat/${room.groupId}` : `/chat/${room.groupId}/${room.slug}`,
  };
}
