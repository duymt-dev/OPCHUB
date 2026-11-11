import { act, cleanup, render, waitFor } from '@testing-library/react';
import { Form, Input } from 'antd';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { domainContext } from '@/i18n/tests/domain-context';
import { ApiError } from '@/lib/api-client';
import { useBotTypeForm } from './use-bot-type-form';
import { useBotConversationTypes } from './use-bot-conversation-types';
import * as api from '../conversation-type-api';
import { typesPage } from '../tests/bulk-fixture';
import viBots from '../../../../messages/vi/bots.json';
import enBots from '../../../../messages/en/bots.json';

vi.mock('@/lib/permissions', () => ({ useCan: () => true }));
vi.mock('../conversation-type-api', async (original) => ({
  ...(await original<typeof api>()),
  fetchBotConversationTypes: vi.fn(),
  createBotConversationType: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchBotConversationTypes).mockResolvedValue(typesPage());
});
afterEach(cleanup);
function context() {
  const c = domainContext();
  const onCreated = vi.fn();
  let current: ReturnType<typeof useBotTypeForm>;
  function Harness() {
    current = useBotTypeForm(useBotConversationTypes(), onCreated);
    return (
      <Form
        component={false}
        form={current.form}
        initialValues={{ name: '', description: 'Raw definition' }}
      >
        <Form.Item name="name" noStyle>
          <Input />
        </Form.Item>
        <Form.Item name="description" noStyle>
          <Input />
        </Form.Item>
      </Form>
    );
  }
  const view = render(<Harness />, c);
  return {
    c,
    onCreated,
    get hook() {
      return current;
    },
    rerender: () => view.rerender(<Harness />),
  };
}
it('AC824-10 bot type local errors update in place while retaining the definition', async () => {
  const h = context();
  await act(() => h.hook.submit({ name: '', description: 'Raw definition' }));
  expect(h.hook.form.getFieldError('name')).toEqual([viBots.bulk.invalidType]);
  h.c.current.locale = 'en';
  h.rerender();
  expect(h.hook.form.getFieldError('name')).toEqual([enBots.bulk.invalidType]);
  expect(h.hook.form.getFieldValue('description')).toBe('Raw definition');
  expect(api.createBotConversationType).not.toHaveBeenCalled();
  expect(h.onCreated).not.toHaveBeenCalled();
});
it('AC824-12 bot type server errors remain raw across language changes', async () => {
  vi.mocked(api.createBotConversationType).mockRejectedValue(
    new ApiError('CONFLICT', 409, 'raw', [
      { path: 'name', message: viBots.bulk.invalidType },
      { path: 'hidden', message: 'Hidden' },
    ]),
  );
  const h = context();
  act(() => h.hook.form.setFieldValue('name', ' User type '));
  await act(() => h.hook.submit({ name: ' User type ', description: 'Raw definition' }));
  await waitFor(() => expect(h.hook.form.getFieldError('name')).toEqual([viBots.bulk.invalidType]));
  h.c.current.locale = 'en';
  h.rerender();
  expect(h.hook.form.getFieldError('name')).toEqual([viBots.bulk.invalidType]);
  expect(api.createBotConversationType).toHaveBeenCalledWith({
    name: 'User type',
    description: 'Raw definition',
  });
  expect(h.hook.form.getFieldValue('name')).toBe(' User type ');
});
