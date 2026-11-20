import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../supabaseClient';
import { displayNameFor, usersApi } from './users.api';

vi.mock('../supabaseClient', () => ({ supabase: { rpc: vi.fn() } }));

const rpc = vi.mocked(supabase.rpc);

function rpcResolves(result: { data: unknown; error: unknown }) {
  rpc.mockResolvedValue(result as Awaited<ReturnType<typeof supabase.rpc>>);
}

beforeEach(() => {
  rpc.mockReset();
});

describe('displayNameFor', () => {
  it('uses the name when there is one', () => {
    expect(displayNameFor('example1@example.com', 'Example User 1')).toBe('Example User 1');
  });

  it('falls back to the part of the email before the @', () => {
    expect(displayNameFor('example1@example.com')).toBe('example1');
    expect(displayNameFor('example1@example.com', null)).toBe('example1');
    expect(displayNameFor('example1@example.com', '')).toBe('example1');
  });
});

describe('usersApi.fetchUsers', () => {
  it('calls get_all_users and maps every row to an email and a display name', async () => {
    rpcResolves({
      data: [
        { email: 'example1@example.com', name: 'Example User 1' },
        { email: 'example3@example.com', name: null },
      ],
      error: null,
    });

    await expect(usersApi.fetchUsers()).resolves.toEqual([
      { email: 'example1@example.com', name: 'Example User 1' },
      { email: 'example3@example.com', name: 'example3' },
    ]);
    expect(rpc).toHaveBeenCalledWith('get_all_users');
  });

  it('returns an empty list when the call returns nothing', async () => {
    rpcResolves({ data: null, error: null });
    await expect(usersApi.fetchUsers()).resolves.toEqual([]);
  });

  it('throws the API error, e.g. for a visitor who is not signed in', async () => {
    const failure = new Error('permission denied for function get_all_users');
    rpcResolves({ data: null, error: failure });
    await expect(usersApi.fetchUsers()).rejects.toBe(failure);
  });
});
