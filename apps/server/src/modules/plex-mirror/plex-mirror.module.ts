import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from '../tasks/tasks.module';
import { PlexMirrorSite } from './entities/plex-mirror-site.entities';
import { PlexMirrorReconciliationService } from './plex-mirror-reconciliation.service';
import { PlexMirrorSiteController } from './plex-mirror-site.controller';
import { PlexMirrorSiteService } from './plex-mirror-site.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlexMirrorSite]), TasksModule],
  providers: [PlexMirrorSiteService, PlexMirrorReconciliationService],
  controllers: [PlexMirrorSiteController],
  exports: [PlexMirrorSiteService],
})
export class PlexMirrorModule {}
