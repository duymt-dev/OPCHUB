import { expect, it } from 'vitest';
import { isWriteClick, type RoTarget } from './model-ro';

const target = (tag: string, text: string, extra: Partial<RoTarget> = {}): RoTarget => ({
  tag,
  text,
  title: '',
  roOk: false,
  act: false,
  pointer: true,
  ...extra,
});
it('D-141 AC824-11 inherited pointer on icon/span cannot bypass enclosing write identity', () => {
  for (const tag of ['SPAN', 'svg', 'path'])
    expect(
      isWriteClick([target(tag, '+'), target('BUTTON', 'Translated action', { act: true })]),
    ).toBe(true);
});
it('D-141 AC824-11 closest safe marker and safe control boundary remain allowed', () => {
  expect(
    isWriteClick([target('SPAN', '', { roOk: true }), target('BUTTON', 'Write', { act: true })]),
  ).toBe(false);
  expect(
    isWriteClick([
      target('SPAN', 'Icon'),
      target('BUTTON', 'Xem chi tiết'),
      target('DIV', '', { act: true }),
    ]),
  ).toBe(false);
});
it('D-141 AC824-11 unmarked legacy buttons still classify their complete VI action label', () => {
  expect(isWriteClick([target('SPAN', '+'), target('BUTTON', '+ Thêm nhóm')])).toBe(true);
  expect(isWriteClick([target('svg', ''), target('BUTTON', '', { title: 'Xóa' })])).toBe(true);
});
it('D-141 AC824-11 legacy custom pointer fallback and readonly select semantics remain', () => {
  expect(isWriteClick([target('DIV', 'Sửa nhóm')])).toBe(true);
  expect(isWriteClick([target('SELECT', '', { act: true })])).toBe(true);
  expect(isWriteClick([target('DIV', 'Tìm')])).toBe(false);
});
