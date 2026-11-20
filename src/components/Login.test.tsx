import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { supabase } from '../supabaseClient';
import { Login } from './Login';

vi.mock('../supabaseClient', () => ({ supabase: { auth: { signInWithPassword: vi.fn() } } }));

const signIn = vi.mocked(supabase.auth.signInWithPassword);
type SignInResult = Awaited<ReturnType<typeof signIn>>;

// The labels are not linked to their inputs, so the fields are found by their placeholders.
const emailField = () => screen.getByPlaceholderText('example@example.com');
const passwordField = () => screen.getByPlaceholderText('enter your password');

async function submit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(emailField(), email);
  await user.type(passwordField(), password);
  await user.click(screen.getByRole('button', { name: 'Login' }));
}

beforeEach(() => {
  signIn.mockReset();
});

describe('Login', () => {
  it('sets the page title', () => {
    render(<Login />);
    expect(document.title).toBe('Login | Dravon');
  });

  it('signs in with the email and password that were typed', async () => {
    signIn.mockResolvedValue({ data: {}, error: null } as SignInResult);
    render(<Login />);

    await submit('example1@example.com', 'password123');

    expect(signIn).toHaveBeenCalledExactlyOnceWith({ email: 'example1@example.com', password: 'password123' });
  });

  it('shows a busy, disabled button while signing in', async () => {
    let finish!: (result: SignInResult) => void;
    signIn.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<Login />);

    await submit('example1@example.com', 'password123');

    const busy = screen.getByRole('button', { name: /Signing in/ });
    expect(busy).toBeDisabled();

    finish({ data: {}, error: null } as SignInResult);
    expect(await screen.findByRole('button', { name: 'Login' })).toBeEnabled();
  });

  it('shows the error returned by Supabase and lets the user try again', async () => {
    signIn.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } } as SignInResult);
    render(<Login />);

    await submit('example1@example.com', 'not-the-password');

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
  });

  it('clears the previous error when submitting again', async () => {
    signIn.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } } as SignInResult);
    render(<Login />);
    await submit('example1@example.com', 'wrong');
    await screen.findByText('Invalid login credentials');

    let finish!: (result: SignInResult) => void;
    signIn.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Login' }));

    expect(screen.queryByText('Invalid login credentials')).not.toBeInTheDocument();
    finish({ data: {}, error: null } as SignInResult);
    await screen.findByRole('button', { name: 'Login' });
  });

  it('does not submit without both fields (the browser requires them)', async () => {
    render(<Login />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Login' }));

    expect(emailField()).toBeRequired();
    expect(passwordField()).toBeRequired();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('says that public sign-up is disabled', () => {
    render(<Login />);
    expect(screen.getByText('Public sign-up is disabled for security reasons.')).toBeInTheDocument();
  });
});
