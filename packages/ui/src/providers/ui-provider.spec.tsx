import { cleanup, render, screen } from '@testing-library/react';
import { Empty } from 'antd';
import enGB from 'antd/locale/en_GB';
import viVN from 'antd/locale/vi_VN';
import { afterEach, describe, expect, it } from 'vitest';
import { UiProvider } from './ui-provider';

afterEach(cleanup);

describe('D-141 AC824-09 scoped shared UiProvider locale', () => {
  it('retains the existing Vietnamese default without a new prop', () => {
    render(
      <UiProvider>
        <Empty image={false} />
      </UiProvider>,
    );
    expect(screen.getByText(viVN.Empty?.description ?? '')).toBeTruthy();
  });

  it('supports isolated siblings and locale updates without a new App provider or global mutation', () => {
    const first = render(
      <UiProvider locale={enGB}>
        <Empty />
      </UiProvider>,
    );
    const second = render(
      <UiProvider>
        <Empty />
      </UiProvider>,
    );
    expect(first.container.textContent).toContain(enGB.Empty?.description);
    expect(second.container.textContent).toContain(viVN.Empty?.description);
    first.rerender(
      <UiProvider locale={viVN}>
        <Empty />
      </UiProvider>,
    );
    expect(first.container.textContent).toContain(viVN.Empty?.description);
    expect(second.container.textContent).toContain(viVN.Empty?.description);
  });
});
