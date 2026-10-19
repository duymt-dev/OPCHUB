import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarEvents, toSidebarEvent } from './sidebar-events';

describe('SidebarEvents (ver2 chân sidebar)', () => {
  const e = { id: 'e1', title: 'OPC Meetup #12', day: 'T5, 22/10', time: '19:30' };

  it('toSidebarEvent tách thứ + ngày, meta "ngày · giờ · hình thức"', () => {
    expect(toSidebarEvent({ ...e, mode: 'offline' })).toEqual({
      id: 'e1',
      dow: 'T5',
      dnum: '22',
      title: 'OPC Meetup #12',
      meta: 'T5, 22/10 · 19:30 · Offline',
    });
    expect(toSidebarEvent({ ...e, day: 'CN, 01/11', mode: 'online' }).dnum).toBe('01');
  });

  it('tối đa 3 dòng; bấm dòng / Xem tất cả gọi đúng callback', () => {
    const onOpen = vi.fn();
    const onAll = vi.fn();
    const items = ['a', 'b', 'c', 'd'].map((id) => toSidebarEvent({ ...e, id, mode: 'online' }));
    render(
      <SidebarEvents
        title="Sự kiện sắp tới"
        allLabel="Xem tất cả"
        items={items}
        onAll={onAll}
        onOpen={onOpen}
      />,
    );
    expect(screen.getAllByRole('button', { name: /OPC Meetup #12/ })).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('button', { name: /OPC Meetup #12/ })[1]!);
    expect(onOpen).toHaveBeenCalledWith('b');
    fireEvent.click(screen.getByRole('button', { name: 'Xem tất cả' }));
    expect(onAll).toHaveBeenCalled();
  });
});
