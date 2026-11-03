import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { usersApi, displayNameFor, type AppUser } from '../services/users.api';

export function useUsers(enabled = true) {
  const { data: users = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ['users'],
    queryFn: usersApi.fetchUsers,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Resolve an email to a human-readable name, falling back to the email prefix
  const getDisplayName = useCallback(
    (email: string) => users.find(u => u.email === email)?.name ?? displayNameFor(email),
    [users]
  );

  return { users, isLoading, getDisplayName };
}
