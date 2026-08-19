import {
  ApprovalDecision,
  ApprovalVoteBody,
  approvalVoteBodySchema,
  UserRole,
} from '@maintainerr/contracts';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CollectionApprovalService } from './collection-approval.service';

// JwtAuthGuard already runs globally (APP_GUARD in AppModule) - only the
// role restriction needs to be declared here.
@Controller('api/collections/media/approvals')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.APPROVER)
export class CollectionApprovalController {
  constructor(
    private readonly collectionApprovalService: CollectionApprovalService,
  ) {}

  @Get('/pending')
  async listPending() {
    return this.collectionApprovalService.listPending();
  }

  @Post('/approve')
  async approve(
    @Body(new ZodValidationPipe(approvalVoteBodySchema))
    body: ApprovalVoteBody,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionApprovalService.castVote(
      body.collectionId,
      body.mediaId,
      user.id,
      ApprovalDecision.APPROVE,
    );
  }

  @Post('/reject')
  async reject(
    @Body(new ZodValidationPipe(approvalVoteBodySchema))
    body: ApprovalVoteBody,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionApprovalService.castVote(
      body.collectionId,
      body.mediaId,
      user.id,
      ApprovalDecision.REJECT,
    );
  }
}
