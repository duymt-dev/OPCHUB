import { describe, expect, it } from 'vitest';
import { EVENT_DESCRIPTION_DEFAULT } from './content-defaults';
import { emptyEventForm, formToUpsert } from './model';

describe('D-141 AC824-11 event content is not translated UI', () => {
  const form = { ...emptyEventForm(), date: '2026-11-11', title: 'Tên sự kiện' };

  it.each(['', '<p><br></p>', '  '])(
    'retains the vi default for blank content: %s',
    (description) => {
      expect(formToUpsert({ ...form, description }, EVENT_DESCRIPTION_DEFAULT).description).toBe(
        'Thông tin chi tiết sẽ được cập nhật.',
      );
    },
  );

  it('retains authored HTML, name, canonical date and time', () => {
    const description = '<p>Nội dung riêng &amp; không dịch</p>';
    expect(formToUpsert({ ...form, description }, EVENT_DESCRIPTION_DEFAULT)).toMatchObject({
      title: 'Tên sự kiện',
      description,
      startsAt: '2026-11-11T12:00:00.000Z',
    });
  });
});
