import {
  ApprovalVoteBody,
  PendingApprovalItemDto,
} from '@maintainerr/contracts'
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query'
import GetApiHandler, { PostApiHandler } from '../utils/ApiHandler'

export type PendingApprovalsQueryKey = ['approvals', 'pending']

type UsePendingApprovalsOptions = Omit<
  UseQueryOptions<PendingApprovalItemDto[], Error>,
  'queryKey' | 'queryFn'
>

export const usePendingApprovals = (options?: UsePendingApprovalsOptions) => {
  return useQuery<PendingApprovalItemDto[], Error>({
    queryKey: ['approvals', 'pending'] satisfies PendingApprovalsQueryKey,
    queryFn: async () => {
      return await GetApiHandler<PendingApprovalItemDto[]>(
        '/collections/media/approvals/pending',
      )
    },
    ...options,
  })
}

export type UsePendingApprovalsResult = ReturnType<typeof usePendingApprovals>

type VoteResult =
  | { outcome: 'pending'; currentApprovals: number; requiredApprovals: number }
  | { outcome: 'approved' }
  | { outcome: 'rejected' }

type UseCastApprovalVoteOptions = Omit<
  UseMutationOptions<
    VoteResult,
    Error,
    { body: ApprovalVoteBody; decision: 'approve' | 'reject' }
  >,
  'mutationFn' | 'mutationKey'
>

export const useCastApprovalVote = (options?: UseCastApprovalVoteOptions) => {
  const queryClient = useQueryClient()

  return useMutation<
    VoteResult,
    Error,
    { body: ApprovalVoteBody; decision: 'approve' | 'reject' }
  >({
    mutationKey: ['approvals', 'castVote'],
    mutationFn: async ({ body, decision }) => {
      return await PostApiHandler<VoteResult>(
        `/collections/media/approvals/${decision}`,
        body,
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['approvals', 'pending'] satisfies PendingApprovalsQueryKey,
      })
    },
    ...options,
  })
}

export type UseCastApprovalVoteResult = ReturnType<typeof useCastApprovalVote>
