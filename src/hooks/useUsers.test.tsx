import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usersApi } from '../services/users.api';
import { queryWrapper, USER_A, USER_B } from '../test/builders';
import { useUsers } from './useUsers';

vi.mock('../services/users.api', async importOriginal => {
  const original = await importOriginal<typeof import('../services/users.api')>();
  return { ...original, usersApi: { fetchUsers: vi.fn() } };
});

const fetchUsers = vi.mocked(usersApi.fetchUsers);

beforeEach(() => {
  fetchUsers.mockReset();
});

describe('useUsers', () => {
  it('loads the member list', async () => {
    fetchUsers.mockResolvedValue([USER_A, USER_B]);

    const { result } = renderHook(() => useUsers(), queryWrapper());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.users).toEqual([USER_A, USER_B]));
    expect(result.current.isLoading).toBe(false);
  });

  it('does not ask for the list while disabled (signed out)', () => {
    const { result } = renderHook(() => useUsers(false), queryWrapper());

    expect(fetchUsers).not.toHaveBeenCalled();
    expect(result.current.users).toEqual([]);
  });

  it('getDisplayName returns the member name for a known email', async () => {
    fetchUsers.mockResolvedValue([USER_A, USER_B]);
    const { result } = renderHook(() => useUsers(), queryWrapper());
    await waitFor(() => expect(result.current.users).toHaveLength(2));

    expect(result.current.getDisplayName(USER_B.email)).toBe('Example User 2');
  });

  it('getDisplayName falls back to the email prefix for an unknown email', async () => {
    fetchUsers.mockResolvedValue([USER_A]);
    const { result } = renderHook(() => useUsers(), queryWrapper());
    await waitFor(() => expect(result.current.users).toHaveLength(1));

    expect(result.current.getDisplayName('former.example@example.com')).toBe('former.example');
  });
});
