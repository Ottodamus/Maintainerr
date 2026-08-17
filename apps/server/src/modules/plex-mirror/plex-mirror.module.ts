import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from '../collections/entities/collection.entities';
import { CollectionMedia } from '../collections/entities/collection_media.entities';
import { TasksModule } from '../tasks/tasks.module';
import { PlexMirrorCollectionLink } from './entities/plex-mirror-collection-link.entities';
import { PlexMirrorSite } from './entities/plex-mirror-site.entities';
import { PlexMirrorReconciliationService } from './plex-mirror-reconciliation.service';
import { PlexMirrorSiteController } from './plex-mirror-site.controller';
import { PlexMirrorSiteService } from './plex-mirror-site.service';
import { PlexMirrorSyncService } from './plex-mirror-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlexMirrorSite,
      PlexMirrorCollectionLink,
      Collection,
      CollectionMedia,
    ]),
    TasksModule,
  ],
  providers: [
    PlexMirrorSiteService,
    PlexMirrorSyncService,
    PlexMirrorReconciliationService,
  ],
  controllers: [PlexMirrorSiteController],
  exports: [PlexMirrorSiteService],
})
export class PlexMirrorModule {}
