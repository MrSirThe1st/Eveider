import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchJson } from '@/lib/api/fetch-json';
import { STALE_TIMES } from '@/lib/query/stale-times';

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

function usersQueryKey(params: UsersQueryParams) {
  return ['users', params] as const;
}

function usersUrl({ role, search }: UsersQueryParams) {
  const params = new URLSearchParams({ role });
  if (search) params.set('search', search);
  return `/api/users?${params.toString()}`;
}

export function useUsersQuery(params: UsersQueryParams) {
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: async () => {
      const data = await fetchJson<{ users: UserListItem[] }>(usersUrl(params));
      return data.users;
    },
    staleTime: STALE_TIMES.users,
    placeholderData: keepPreviousData,
  });
}

export { usersQueryKey };
