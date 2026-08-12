import { BaseEventDto } from './baseEvent.dto'
import { MaintainerrEvent } from './maintainerrEvent'

export class CollectionMediaApprovalRequestedEventDto extends BaseEventDto {
  collectionMediaId: number
  collectionId: number
  requiredApprovals: number

  constructor(
    collectionMediaId: number,
    collectionId: number,
    requiredApprovals: number,
  ) {
    super(MaintainerrEvent.CollectionMedia_ApprovalRequested)
    this.collectionMediaId = collectionMediaId
    this.collectionId = collectionId
    this.requiredApprovals = requiredApprovals
  }
}

export class CollectionMediaApprovalApprovedEventDto extends BaseEventDto {
  collectionMediaId: number
  collectionId: number
  approvedByUserId: number
  currentApprovals: number
  requiredApprovals: number

  constructor(
    collectionMediaId: number,
    collectionId: number,
    approvedByUserId: number,
    currentApprovals: number,
    requiredApprovals: number,
  ) {
    super(MaintainerrEvent.CollectionMedia_ApprovalApproved)
    this.collectionMediaId = collectionMediaId
    this.collectionId = collectionId
    this.approvedByUserId = approvedByUserId
    this.currentApprovals = currentApprovals
    this.requiredApprovals = requiredApprovals
  }
}

export class CollectionMediaApprovalRejectedEventDto extends BaseEventDto {
  collectionMediaId: number
  collectionId: number
  rejectedByUserId: number

  constructor(
    collectionMediaId: number,
    collectionId: number,
    rejectedByUserId: number,
  ) {
    super(MaintainerrEvent.CollectionMedia_ApprovalRejected)
    this.collectionMediaId = collectionMediaId
    this.collectionId = collectionId
    this.rejectedByUserId = rejectedByUserId
  }
}
