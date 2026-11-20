import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { aSession } from '../test/builders';
import { useAuthStore } from './useAuthStore';

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const auth = vi.mocked(supabase.auth);
let emitAuthChange: (event: AuthChangeEvent, session: Session | null) => void;
const unsubscribe = vi.fn();

function storedSession(session: Session | null) {
  auth.getSession.mockResolvedValue({ data: { session }, error: null } as Awaited<ReturnType<typeof auth.getSession>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ session: null, currentUser: '', currentUserName: '', loading: true });
  auth.onAuthStateChange.mockImplementation(callback => {
    emitAuthChange = (event, session) => { void callback(event, session); };
    return { data: { subscription: { id: 'sub', callback, unsubscribe } } } as ReturnType<typeof auth.onAuthStateChange>;
  });
  storedSession(null);
});

const state = () => useAuthStore.getState();

describe('useAuthStore.initialize', () => {
  it('is loading until the stored session has been read', () => {
    expect(state().loading).toBe(true);
  });

  it('loads a stored session: the email is the identity and the metadata name is shown', async () => {
    const session = aSession('example1@example.com', { name: 'Example User 1' });
    storedSession(session);

    state().initialize();

    await vi.waitFor(() => expect(state().loading).toBe(false));
    expect(state()).toMatchObject({ session, currentUser: 'example1@example.com', currentUserName: 'Example User 1' });
  });

  it('uses full_name when there is no name', async () => {
    storedSession(aSession('example1@example.com', { full_name: 'Example Full Name' }));
    state().initialize();
    await vi.waitFor(() => expect(state().currentUserName).toBe('Example Full Name'));
  });

  it('falls back to the email prefix when the metadata has no name at all', async () => {
    storedSession(aSession('example1@example.com', {}));
    state().initialize();
    await vi.waitFor(() => expect(state().currentUserName).toBe('example1'));
  });

  it('finishes loading signed out when there is no stored session', async () => {
    state().initialize();
    await vi.waitFor(() => expect(state().loading).toBe(false));
    expect(state()).toMatchObject({ session: null, currentUser: '', currentUserName: '' });
  });

  it('follows later sign-ins and sign-outs', async () => {
    state().initialize();
    await vi.waitFor(() => expect(state().loading).toBe(false));

    emitAuthChange('SIGNED_IN', aSession('example2@example.com', { name: 'Example User 2' }));
    expect(state()).toMatchObject({ currentUser: 'example2@example.com', currentUserName: 'Example User 2' });

    emitAuthChange('SIGNED_OUT', null);
    expect(state()).toMatchObject({ session: null, currentUser: '' });
  });

  it('returns a cleanup function that stops listening', () => {
    const stop = state().initialize();
    expect(unsubscribe).not.toHaveBeenCalled();

    stop();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('useAuthStore.logout', () => {
  it('signs out through Supabase', async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await state().logout();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});
