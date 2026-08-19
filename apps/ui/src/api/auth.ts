import { UserDto } from '@maintainerr/contracts'
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query'
import GetApiHandler, { PostApiHandler } from '../utils/ApiHandler'

export type CurrentUserQueryKey = ['auth', 'me']

type UseCurrentUserOptions = Omit<
  UseQueryOptions<UserDto | null, Error>,
  'queryKey' | 'queryFn'
>

export const useCurrentUser = (options?: UseCurrentUserOptions) => {
  return useQuery<UserDto | null, Error>({
    queryKey: ['auth', 'me'] satisfies CurrentUserQueryKey,
    queryFn: async () => {
      try {
        return await GetApiHandler<UserDto>('/users/me')
      } catch {
        return null
      }
    },
    staleTime: 60_000,
    retry: false,
    ...options,
  })
}

export type UseCurrentUserResult = ReturnType<typeof useCurrentUser>

type UseClientIdOptions = Omit<
  UseQueryOptions<string, Error>,
  'queryKey' | 'queryFn'
>

// The login popup needs this device identifier before any session exists,
// so it comes from its own public endpoint rather than the (auth-gated)
// full settings payload.
export const useClientId = (options?: UseClientIdOptions) => {
  return useQuery<string, Error>({
    queryKey: ['auth', 'clientId'],
    queryFn: async () => {
      const { clientId } = await GetApiHandler<{ clientId: string }>(
        '/auth/client-id',
      )
      return clientId
    },
    staleTime: Infinity,
    ...options,
  })
}

export type UseClientIdResult = ReturnType<typeof useClientId>

type UseLoginWithPlexOptions = Omit<
  UseMutationOptions<UserDto, Error, string>,
  'mutationFn' | 'mutationKey'
>

export const useLoginWithPlex = (options?: UseLoginWithPlexOptions) => {
  const queryClient = useQueryClient()

  return useMutation<UserDto, Error, string>({
    mutationKey: ['auth', 'plexCallback'],
    mutationFn: async (authToken: string) => {
      return await PostApiHandler<UserDto>('/auth/plex/callback', {
        authToken,
      })
    },
    onSuccess: (user) => {
      queryClient.setQueryData(
        ['auth', 'me'] satisfies CurrentUserQueryKey,
        user,
      )
    },
    ...options,
  })
}

export type UseLoginWithPlexResult = ReturnType<typeof useLoginWithPlex>

type UseLoginWithPasswordOptions = Omit<
  UseMutationOptions<UserDto, Error, { username: string; password: string }>,
  'mutationFn' | 'mutationKey'
>

// The break-glass account: a fallback for when Plex OAuth itself is
// unreachable, not a general auth method.
export const useLoginWithPassword = (options?: UseLoginWithPasswordOptions) => {
  const queryClient = useQueryClient()

  return useMutation<UserDto, Error, { username: string; password: string }>({
    mutationKey: ['auth', 'localLogin'],
    mutationFn: async (credentials) => {
      return await PostApiHandler<UserDto>('/auth/local/login', credentials)
    },
    onSuccess: (user) => {
      queryClient.setQueryData(
        ['auth', 'me'] satisfies CurrentUserQueryKey,
        user,
      )
    },
    ...options,
  })
}

export type UseLoginWithPasswordResult = ReturnType<typeof useLoginWithPassword>

type UseLogoutOptions = Omit<
  UseMutationOptions<{ success: boolean }, Error, void>,
  'mutationFn' | 'mutationKey'
>

export const useLogout = (options?: UseLogoutOptions) => {
  const queryClient = useQueryClient()

  return useMutation<{ success: boolean }, Error, void>({
    mutationKey: ['auth', 'logout'],
    mutationFn: async () => {
      return await PostApiHandler<{ success: boolean }>('/auth/logout', {})
    },
    onSuccess: () => {
      queryClient.setQueryData(
        ['auth', 'me'] satisfies CurrentUserQueryKey,
        null,
      )
    },
    ...options,
  })
}

export type UseLogoutResult = ReturnType<typeof useLogout>
