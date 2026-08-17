import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Tracks the mirror site's own local BoxSet (Plex collection) ratingKey for
// one of Maintainerr's own Collection rows, the same role
// Collection.mediaServerId plays on the primary server - but scoped per site,
// since each site's Plex library assigns its own independent ratingKeys.
@Entity()
@Index(['plexMirrorSiteId', 'collectionId'], { unique: true })
export class PlexMirrorCollectionLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  plexMirrorSiteId: number;

  @Column()
  collectionId: number;

  // Null until the collection has at least one matched item on this site.
  @Column({ nullable: true })
  mirrorRatingKey: string | null;
}
