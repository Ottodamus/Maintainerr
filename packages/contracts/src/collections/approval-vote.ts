import z from 'zod'
import { MediaItemType } from '../media-server/enums'

export const approvalVoteBodySchema = z.object({
  collectionId: z.coerce.number().int(),
  mediaId: z.string().min(1),
})

export type ApprovalVoteBody = z.infer<typeof approvalVoteBodySchema>

export interface PendingApprovalItemDto {
  collectionId: number
  collectionTitle: string
  mediaServerId: string
  type: MediaItemType
  requiredApprovals: number
  currentApprovals: number
  addDate: Date
}
