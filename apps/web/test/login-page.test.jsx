import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../src/pages/LoginPage.jsx';

// LEARN: we mock the auth CONTEXT, not fetch. The unit under test is the
// form's behavior (validation, submission, error display) — the network
// dance already has its own integration tests on the API side. Test each
// thing where it lives.
const login = vi.fn();
vi.mock('../src/auth/AuthContext.jsx', () => ({
  useAuth: () => ({ login }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );

// LEARN: these tests interact the way a user does — find by label, type,
// click — not by reaching into component internals. If a refactor keeps
// the behavior, the tests keep passing. That is the whole point.
describe('LoginPage', () => {
  it('shows the shared-schema validation message without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'pw');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('submits normalized credentials', async () => {
    const user = userEvent.setup();
    login.mockResolvedValueOnce();
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'Ana@GitJira.dev');
    await user.type(screen.getByLabelText(/password/i), 'demo-password-1');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // the shared zod schema lowercased the email before submit
    expect(login).toHaveBeenCalledWith({
      email: 'ana@gitjira.dev',
      password: 'demo-password-1',
    });
  });

  it('surfaces a failed login as a form-level error', async () => {
    const user = userEvent.setup();
    login.mockRejectedValueOnce(new Error('Invalid email or password'));
    renderPage();

    await user.type(screen.getByLabelText(/email/i), 'ana@gitjira.dev');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password!');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
