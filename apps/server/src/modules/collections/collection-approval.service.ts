import {
  ApprovalDecision,
  CollectionMediaApprovalApprovedEventDto,
  CollectionMediaApprovalRejectedEventDto,
  CollectionMediaApprovalRequestedEventDto,
  CollectionMediaApprovalState,
  MaintainerrEvent,
  PendingApprovalItemDto,
  UserRole,
} from '@maintainerr/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { MaintainerrLogger } from '../logging/logs.service';
import { Exclusion } from '../rules/entities/exclusion.entities';
import { RuleGroup } from '../rules/entities/rule-group.entities';
import { CollectionsService } from './collections.service';
import { Collection } from './entities/collection.entities';
import { CollectionMedia } from './entities/collection_media.entities';
import { CollectionMediaApproval } from './entities/collection_media_approval.entities';

export type CastVoteResult =
  | { outcome: 'pending'; currentApprovals: number; requiredApprovals: number }
  | { outcome: 'approved' }
  | { outcome: 'rejected' };

@Injectable()
export class CollectionApprovalService {
  constructor(
    @InjectRepository(CollectionMedia)
    private readonly collectionMediaRepo: Repository<CollectionMedia>,
    @InjectRepository(CollectionMediaApproval)
    private readonly approvalRepo: Repository<CollectionMediaApproval>,
    @InjectRepository(RuleGroup)
    private readonly ruleGroupRepo: Repository<RuleGroup>,
    @InjectRepository(Exclusion)
    private readonly exclusionRepo: Repository<Exclusion>,
    private readonly collectionsService: CollectionsService,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: MaintainerrLogger,
  ) {
    this.logger.setContext(CollectionApprovalService.name);
  }

  /**
   * Called from CollectionHandler.handleMedia() the first time it sees a
   * gated collection's item (approvalState still null). Idempotent against
   * concurrent calls in spirit, though a homelab single-worker run makes a
   * real race unlikely.
   */
  public async requestApproval(
    collection: Collection,
    media: CollectionMedia,
  ): Promise<void> {
    await this.collectionMediaRepo.update(
      { id: media.id },
      { approvalState: CollectionMediaApprovalState.PENDING },
    );
    media.approvalState = CollectionMediaApprovalState.PENDING;

    this.eventEmitter.emit(
      MaintainerrEvent.CollectionMedia_ApprovalRequested,
      new CollectionMediaApprovalRequestedEventDto(
        media.id,
        collection.id,
        collection.requiredApprovals,
      ),
    );

    const approverCount = await this.countEligibleApprovers();
    this.logger.log(
      `'${collection.title}' item ${media.mediaServerId} needs ${collection.requiredApprovals} approval(s) before it can be handled (${approverCount} eligible approver(s)).`,
    );
  }

  private async countEligibleApprovers(): Promise<number> {
    const users = await this.usersService.findAll();
    return users.filter(
      (u) =>
        u.allowed &&
        (u.role === UserRole.ADMIN || u.role === UserRole.APPROVER),
    ).length;
  }

  public async castVote(
    collectionId: number,
    mediaServerId: string,
    userId: number,
    decision: ApprovalDecision,
  ): Promise<CastVoteResult> {
    const collection =
      await this.collectionsService.getCollectionRecord(collectionId);
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    const media = await this.collectionsService.getCollectionMediaRecord(
      collectionId,
      mediaServerId,
    );
    if (!media) {
      throw new NotFoundException('Media not found in this collection');
    }

    const existingVote = await this.approvalRepo.findOne({
      where: { collectionMediaId: media.id, userId },
    });
    await this.approvalRepo.save({
      ...existingVote,
      collectionMediaId: media.id,
      userId,
      decision,
      decidedAt: new Date(),
    });

    if (decision === ApprovalDecision.REJECT) {
      await this.handleReject(collection, media, userId);
      return { outcome: 'rejected' };
    }

    return this.handleApprove(collection, media, userId);
  }

  private async handleApprove(
    collection: Collection,
    media: CollectionMedia,
    approvedByUserId: number,
  ): Promise<CastVoteResult> {
    const currentApprovals = await this.approvalRepo.count({
      where: {
        collectionMediaId: media.id,
        decision: ApprovalDecision.APPROVE,
      },
    });
    const requiredApprovals = collection.requiredApprovals;
    const isFullyApproved = currentApprovals >= requiredApprovals;

    if (isFullyApproved) {
      await this.collectionMediaRepo.update(
        { id: media.id },
        { approvalState: CollectionMediaApprovalState.APPROVED },
      );
    }

    this.eventEmitter.emit(
      MaintainerrEvent.CollectionMedia_ApprovalApproved,
      new CollectionMediaApprovalApprovedEventDto(
        media.id,
        collection.id,
        approvedByUserId,
        currentApprovals,
        requiredApprovals,
      ),
    );

    return isFullyApproved
      ? { outcome: 'approved' }
      : { outcome: 'pending', currentApprovals, requiredApprovals };
  }

  /**
   * A single reject is authoritative: exclude the item so the rule engine
   * stops re-proposing it, then remove it from the collection immediately
   * rather than waiting for the next rule run to notice the exclusion.
   */
  private async handleReject(
    collection: Collection,
    media: CollectionMedia,
    rejectedByUserId: number,
  ): Promise<void> {
    const ruleGroup = await this.ruleGroupRepo.findOne({
      where: { collectionId: collection.id },
    });

    await this.exclusionRepo.save({
      mediaServerId: media.mediaServerId,
      ruleGroupId: ruleGroup?.id ?? null,
      parent: media.mediaServerId,
      type: collection.type,
    });

    await this.collectionsService.removeFromCollection(collection.id, [
      { mediaServerId: media.mediaServerId },
    ]);

    this.eventEmitter.emit(
      MaintainerrEvent.CollectionMedia_ApprovalRejected,
      new CollectionMediaApprovalRejectedEventDto(
        media.id,
        collection.id,
        rejectedByUserId,
      ),
    );

    this.logger.log(
      `'${collection.title}' item ${media.mediaServerId} was rejected and excluded.`,
    );
  }

  public async listPending(): Promise<PendingApprovalItemDto[]> {
    const pending = await this.collectionMediaRepo.find({
      where: { approvalState: CollectionMediaApprovalState.PENDING },
    });

    const items: PendingApprovalItemDto[] = [];
    for (const media of pending) {
      const collection = await this.collectionsService.getCollectionRecord(
        media.collectionId,
      );
      if (!collection || collection.requiredApprovals <= 0) {
        continue;
      }

      const currentApprovals = await this.approvalRepo.count({
        where: {
          collectionMediaId: media.id,
          decision: ApprovalDecision.APPROVE,
        },
      });

      items.push({
        collectionId: collection.id,
        collectionTitle: collection.title,
        mediaServerId: media.mediaServerId,
        type: collection.type,
        requiredApprovals: collection.requiredApprovals,
        currentApprovals,
        addDate: media.addDate,
      });
    }

    return items;
  }
}
