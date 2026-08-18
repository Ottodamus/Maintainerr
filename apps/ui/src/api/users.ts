import { InviteUserDto, UpdateUserDto, UserDto } from '@maintainerr/contracts'
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query'
import GetApiHandler, {
  PatchApiHandler,
  PostApiHandler,
} from '../utils/ApiHandler'

export type UsersQueryKey = ['users', 'all']

type UseUsersOptions = Omit<
  UseQueryOptions<UserDto[], Error>,
  'queryKey' | 'queryFn'
>

export const useUsers = (options?: UseUsersOptions) => {
  return useQuery<UserDto[], Error>({
    queryKey: ['users', 'all'] satisfies UsersQueryKey,
    queryFn: async () => await GetApiHandler<UserDto[]>('/users'),
    ...options,
  })
}

export type UseUsersResult = ReturnType<typeof useUsers>

type UseInviteUserOptions = Omit<
  UseMutationOptions<UserDto, Error, InviteUserDto>,
  'mutationFn' | 'mutationKey'
>

export const useInviteUser = (options?: UseInviteUserOptions) => {
  const queryClient = useQueryClient()

  return useMutation<UserDto, Error, InviteUserDto>({
    mutationKey: ['users', 'invite'],
    mutationFn: async (dto) => await PostApiHandler<UserDto>('/users', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['users', 'all'] satisfies UsersQueryKey,
      })
    },
    ...options,
  })
}

export type UseInviteUserResult = ReturnType<typeof useInviteUser>

export type UpdateUserVariables = { id: number; body: UpdateUserDto }

type UseUpdateUserOptions = Omit<
  UseMutationOptions<UserDto, Error, UpdateUserVariables>,
  'mutationFn' | 'mutationKey'
>

export const useUpdateUser = (options?: UseUpdateUserOptions) => {
  const queryClient = useQueryClient()

  return useMutation<UserDto, Error, UpdateUserVariables>({
    mutationKey: ['users', 'update'],
    mutationFn: async ({ id, body }) =>
      await PatchApiHandler<UserDto>(`/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['users', 'all'] satisfies UsersQueryKey,
      })
    },
    ...options,
  })
}

export type UseUpdateUserResult = ReturnType<typeof useUpdateUser>
