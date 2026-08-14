import { ApprovalDecision } from '@maintainerr/contracts';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { CollectionMedia } from './collection_media.entities';

// One row per (collectionMedia, user) vote - the unique index is what makes
// silence structurally unable to count as approval: a vote requires a row.
@Entity()
@Index(['collectionMediaId', 'userId'], { unique: true })
export class CollectionMediaApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  collectionMediaId: number;

  // Plain column, not a relation: User lives in a different module
  // (modules/users) and this entity doesn't need to load it, only filter/
  // group by it. Resolved against UsersService by callers that need display
  // info.
  @Column()
  userId: number;

  @Column({ default: ApprovalDecision.APPROVE })
  decision: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  decidedAt: Date;

  @ManyToOne(() => CollectionMedia, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collectionMediaId', referencedColumnName: 'id' })
  collectionMedia: Relation<CollectionMedia>;
}
