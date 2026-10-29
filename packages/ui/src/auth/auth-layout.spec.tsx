import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AuthLayout } from './auth-layout';

it('D-93 auth support icon/text/link are separate flex items while controls remain accessible', () => {
  render(
    <AuthLayout
      background="/login.png"
      hero={<h1>Community</h1>}
      supportText="Need help?"
      supportLink="Contact"
      supportHref="/contact"
      language={<button type="button">Language</button>}
      footer={<footer>Terms</footer>}
    >
      <form aria-label="Sign in">
        <input aria-label="Email" />
      </form>
    </AuthLayout>,
  );
  const link = screen.getByRole('link', { name: 'Contact' });
  expect(link.getAttribute('href')).toBe('/contact');
  expect(link.parentElement?.children).toHaveLength(3);
  expect(link.previousElementSibling?.textContent).toBe('Need help?');
  expect(screen.getByRole('button', { name: 'Language' })).toBeTruthy();
  expect(screen.getByRole('form', { name: 'Sign in' })).toBeTruthy();
});
