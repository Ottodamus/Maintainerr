// Persisted on CollectionMedia. 'rejected' is never stored: a reject vote
// removes the item from the collection immediately (see
// CollectionApprovalService.castVote), so there is nothing left to hold that
// state on.
export enum CollectionMediaApprovalState {
  PENDING = 'pending',
  APPROVED = 'approved',
}
