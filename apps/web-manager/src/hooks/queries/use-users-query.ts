import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJson } from '@/lib/api/fetch-json';

export type UserListItem = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isBlocked: boolean;
  createdAt: string;
};

type UsersQueryParams = {
  role: 'customer' | 'courier';
  search: string;
};

function usersUrl({ role, search }: UsersQueryParams) {
  const params = new URLSearchParams({ role });
  if (search) params.set('search', search);
  return `/api/users?${params.toString()}`;
}

export async function fetchUsers(params: UsersQueryParams): Promise<UserListItem[]> {
  const data = await fetchJson<{ users: UserListItem[] }>(usersUrl(params));
  return data.users;
}

export function useUsersQuery(params: UsersQueryParams) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    const isInitial = !hasDataRef.current;
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsFetching(true);
    }
    setError(null);

    try {
      const next = await fetchUsers(params);
      setUsers(next);
      hasDataRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Impossible de charger les utilisateurs.'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [params.role, params.search]);

  useEffect(() => {
    hasDataRef.current = false;
    void load();
  }, [load]);

  return {
    data: users,
    setUsers,
    isLoading,
    isFetching,
    isError: error !== null,
    error,
    refetch: load,
  };
}
