import {
  ApprovalDecision,
  CollectionMediaApprovalState,
} from '@maintainerr/contracts';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Mocked, TestBed } from '@suites/unit';
import { Repository } from 'typeorm';
import {
  createCollection,
  createCollectionMedia,
} from '../../../test/utils/data';
import { Exclusion } from '../rules/entities/exclusion.entities';
import { RuleGroup } from '../rules/entities/rule-group.entities';
import { UsersService } from '../users/users.service';
import { CollectionApprovalService } from './collection-approval.service';
import { CollectionsService } from './collections.service';
import { CollectionMedia } from './entities/collection_media.entities';
import { CollectionMediaApproval } from './entities/collection_media_approval.entities';

describe('CollectionApprovalService', () => {
  let service: CollectionApprovalService;
  let collectionMediaRepo: Mocked<Repository<CollectionMedia>>;
  let approvalRepo: Mocked<Repository<CollectionMediaApproval>>;
  let ruleGroupRepo: Mocked<Repository<RuleGroup>>;
  let exclusionRepo: Mocked<Repository<Exclusion>>;
  let collectionsService: Mocked<CollectionsService>;
  let usersService: Mocked<UsersService>;
  let eventEmitter: Mocked<EventEmitter2>;

  beforeEach(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      CollectionApprovalService,
    ).compile();

    service = unit;
    collectionMediaRepo = unitRef.get(
      getRepositoryToken(CollectionMedia) as string,
    );
    approvalRepo = unitRef.get(
      getRepositoryToken(CollectionMediaApproval) as string,
    );
    ruleGroupRepo = unitRef.get(getRepositoryToken(RuleGroup) as string);
    exclusionRepo = unitRef.get(getRepositoryToken(Exclusion) as string);
    collectionsService = unitRef.get(CollectionsService);
    usersService = unitRef.get(UsersService);
    eventEmitter = unitRef.get(EventEmitter2);

    usersService.findAll.mockResolvedValue([]);
    ruleGroupRepo.findOne.mockResolvedValue(null);
  });

  describe('requestApproval', () => {
    it('marks the item pending and emits a requested event', async () => {
      const collection = createCollection({ requiredApprovals: 2 });
      const media = createCollectionMedia(collection, { id: 5 });

      await service.requestApproval(collection, media);

      expect(collectionMediaRepo.update).toHaveBeenCalledWith(
        { id: 5 },
        { approvalState: CollectionMediaApprovalState.PENDING },
      );
      expect(media.approvalState).toBe(CollectionMediaApprovalState.PENDING);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'collection_media.approval_requested',
        expect.objectContaining({
          collectionMediaId: 5,
          collectionId: collection.id,
        }),
      );
    });
  });

  describe('castVote', () => {
    it('throws NotFoundException when the collection does not exist', async () => {
      collectionsService.getCollectionRecord.mockResolvedValue(null);

      await expect(
        service.castVote(1, 'media-1', 9, ApprovalDecision.APPROVE),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the media is not in the collection', async () => {
      const collection = createCollection({ requiredApprovals: 1 });
      collectionsService.getCollectionRecord.mockResolvedValue(collection);
      collectionsService.getCollectionMediaRecord.mockResolvedValue(null);

      await expect(
        service.castVote(collection.id, 'media-1', 9, ApprovalDecision.APPROVE),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects: excludes the item and removes it from the collection immediately', async () => {
      const collection = createCollection({
        requiredApprovals: 1,
        type: 'movie',
      });
      const media = createCollectionMedia(collection, {
        id: 5,
        mediaServerId: 'media-1',
      });
      collectionsService.getCollectionRecord.mockResolvedValue(collection);
      collectionsService.getCollectionMediaRecord.mockResolvedValue(media);
      approvalRepo.findOne.mockResolvedValue(null);
      ruleGroupRepo.findOne.mockResolvedValue({
        id: 77,
        collectionId: collection.id,
      } as RuleGroup);

      const result = await service.castVote(
        collection.id,
        'media-1',
        9,
        ApprovalDecision.REJECT,
      );

      expect(result).toEqual({ outcome: 'rejected' });
      expect(approvalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionMediaId: 5,
          userId: 9,
          decision: ApprovalDecision.REJECT,
        }),
      );
      expect(exclusionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaServerId: 'media-1',
          ruleGroupId: 77,
          type: 'movie',
        }),
      );
      expect(collectionsService.removeFromCollection).toHaveBeenCalledWith(
        collection.id,
        [{ mediaServerId: 'media-1' }],
      );
      // A rejected item must never reach the "approved" state.
      expect(collectionMediaRepo.update).not.toHaveBeenCalledWith(
        { id: 5 },
        { approvalState: CollectionMediaApprovalState.APPROVED },
      );
    });

    it('approves: stays pending below the required threshold', async () => {
      const collection = createCollection({ requiredApprovals: 2 });
      const media = createCollectionMedia(collection, { id: 5 });
      collectionsService.getCollectionRecord.mockResolvedValue(collection);
      collectionsService.getCollectionMediaRecord.mockResolvedValue(media);
      approvalRepo.findOne.mockResolvedValue(null);
      approvalRepo.count.mockResolvedValue(1);

      const result = await service.castVote(
        collection.id,
        media.mediaServerId,
        9,
        ApprovalDecision.APPROVE,
      );

      expect(result).toEqual({
        outcome: 'pending',
        currentApprovals: 1,
        requiredApprovals: 2,
      });
      expect(collectionMediaRepo.update).not.toHaveBeenCalled();
    });

    it('approves: reaching the threshold marks the item approved', async () => {
      const collection = createCollection({ requiredApprovals: 2 });
      const media = createCollectionMedia(collection, { id: 5 });
      collectionsService.getCollectionRecord.mockResolvedValue(collection);
      collectionsService.getCollectionMediaRecord.mockResolvedValue(media);
      approvalRepo.findOne.mockResolvedValue(null);
      approvalRepo.count.mockResolvedValue(2);

      const result = await service.castVote(
        collection.id,
        media.mediaServerId,
        9,
        ApprovalDecision.APPROVE,
      );

      expect(result).toEqual({ outcome: 'approved' });
      expect(collectionMediaRepo.update).toHaveBeenCalledWith(
        { id: 5 },
        { approvalState: CollectionMediaApprovalState.APPROVED },
      );
    });

    it('records a changed vote (approve after a prior reject) via find-then-save, not a duplicate row', async () => {
      const collection = createCollection({ requiredApprovals: 1 });
      const media = createCollectionMedia(collection, { id: 5 });
      collectionsService.getCollectionRecord.mockResolvedValue(collection);
      collectionsService.getCollectionMediaRecord.mockResolvedValue(media);
      const existingVote = {
        id: 200,
        collectionMediaId: 5,
        userId: 9,
        decision: ApprovalDecision.REJECT,
      } as CollectionMediaApproval;
      approvalRepo.findOne.mockResolvedValue(existingVote);
      approvalRepo.count.mockResolvedValue(1);

      await service.castVote(
        collection.id,
        media.mediaServerId,
        9,
        ApprovalDecision.APPROVE,
      );

      expect(approvalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 200,
          decision: ApprovalDecision.APPROVE,
        }),
      );
    });
  });

  describe('listPending', () => {
    it('excludes collections that no longer require approval', async () => {
      const gatedCollection = createCollection({
        id: 1,
        requiredApprovals: 1,
      });
      const ungatedCollection = createCollection({
        id: 2,
        requiredApprovals: 0,
      });
      const pendingMedia = [
        createCollectionMedia(gatedCollection, {
          id: 10,
          collectionId: 1,
          approvalState: CollectionMediaApprovalState.PENDING,
        }),
        createCollectionMedia(ungatedCollection, {
          id: 11,
          collectionId: 2,
          approvalState: CollectionMediaApprovalState.PENDING,
        }),
      ];
      collectionMediaRepo.find.mockResolvedValue(pendingMedia);
      collectionsService.getCollectionRecord.mockImplementation(async (id) =>
        id === 1 ? gatedCollection : ungatedCollection,
      );
      approvalRepo.count.mockResolvedValue(0);

      const result = await service.listPending();

      expect(result).toHaveLength(1);
      expect(result[0].collectionId).toBe(1);
    });
  });
});
