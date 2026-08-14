import { MediaItemTypeLabels } from '@maintainerr/contracts'
import { useCurrentUser } from '../api/auth'
import { useCastApprovalVote, usePendingApprovals } from '../api/approvals'
import Button from '../components/Common/Button'
import LoadingSpinner from '../components/Common/LoadingSpinner'

const ApprovalsPage = () => {
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser()
  const { data: pending, isLoading: isPendingLoading } = usePendingApprovals({
    enabled: !!currentUser,
  })
  const castVote = useCastApprovalVote()

  if (isUserLoading) {
    return <LoadingSpinner />
  }

  if (!currentUser) {
    return (
      <>
        <title>Approvals - Maintainerr</title>
        <p className="p-4 text-zinc-400">
          Sign in to review items awaiting approval.
        </p>
      </>
    )
  }

  return (
    <>
      <title>Approvals - Maintainerr</title>
      <div className="p-4">
        <h1 className="mb-4 text-2xl font-bold text-zinc-100">
          Pending Approvals
        </h1>
        {isPendingLoading ? (
          <LoadingSpinner />
        ) : !pending || pending.length === 0 ? (
          <p className="text-zinc-400">
            Nothing is currently awaiting approval.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((item) => (
              <li
                key={`${item.collectionId}-${item.mediaServerId}`}
                className="flex items-center justify-between rounded-sm border border-zinc-700 bg-zinc-800 p-4"
              >
                <div>
                  <p className="font-semibold text-zinc-100">
                    {item.collectionTitle}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {MediaItemTypeLabels[item.type]} - media{' '}
                    {item.mediaServerId}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {item.currentApprovals} of {item.requiredApprovals}{' '}
                    approvals
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    buttonType="success"
                    disabled={castVote.isPending}
                    onClick={() =>
                      castVote.mutate({
                        decision: 'approve',
                        body: {
                          collectionId: item.collectionId,
                          mediaId: item.mediaServerId,
                        },
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    buttonType="danger"
                    disabled={castVote.isPending}
                    onClick={() =>
                      castVote.mutate({
                        decision: 'reject',
                        body: {
                          collectionId: item.collectionId,
                          mediaId: item.mediaServerId,
                        },
                      })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export default ApprovalsPage
