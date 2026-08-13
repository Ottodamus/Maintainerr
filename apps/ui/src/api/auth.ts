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
