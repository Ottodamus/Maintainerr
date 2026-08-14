import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCollectionApproval1786722577080 implements MigrationInterface {
  name = 'AddCollectionApproval1786722577080';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "collection_media_approval" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "collectionMediaId" integer NOT NULL,
                "userId" integer NOT NULL,
                "decision" integer NOT NULL DEFAULT (0),
                "decidedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_92f69700771624e228094e87cd" ON "collection_media_approval" ("collectionMediaId", "userId")
        `);
    await queryRunner.query(`
            DROP INDEX "idx_collection_media_collection_id"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_collection_media" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "collectionId" integer NOT NULL,
                "mediaServerId" varchar NOT NULL,
                "tmdbId" integer,
                "addDate" datetime NOT NULL,
                "image_path" varchar,
                "isManual" boolean DEFAULT (0),
                "tvdbId" integer,
                "includedByRule" boolean,
                "manualMembershipSource" varchar,
                "sizeBytes" bigint,
                "ruleEvaluationFailed" boolean NOT NULL DEFAULT (0),
                "approvalState" varchar,
                CONSTRAINT "FK_604b0cd0f85150923289b7f2c19" FOREIGN KEY ("collectionId") REFERENCES "collection" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_collection_media"(
                    "id",
                    "collectionId",
                    "mediaServerId",
                    "tmdbId",
                    "addDate",
                    "image_path",
                    "isManual",
                    "tvdbId",
                    "includedByRule",
                    "manualMembershipSource",
                    "sizeBytes",
                    "ruleEvaluationFailed"
                )
            SELECT "id",
                "collectionId",
                "mediaServerId",
                "tmdbId",
                "addDate",
                "image_path",
                "isManual",
                "tvdbId",
                "includedByRule",
                "manualMembershipSource",
                "sizeBytes",
                "ruleEvaluationFailed"
            FROM "collection_media"
        `);
    await queryRunner.query(`
            DROP TABLE "collection_media"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_collection_media"
                RENAME TO "collection_media"
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_collection_media_collection_id" ON "collection_media" ("collectionId")
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_collection" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "libraryId" varchar NOT NULL,
                "title" varchar NOT NULL,
                "description" varchar,
                "isActive" boolean NOT NULL DEFAULT (1),
                "arrAction" integer NOT NULL DEFAULT (0),
                "visibleOnHome" boolean NOT NULL DEFAULT (0),
                "deleteAfterDays" integer,
                "type" varchar NOT NULL DEFAULT ('movie'),
                "manualCollection" boolean NOT NULL DEFAULT (0),
                "manualCollectionName" varchar DEFAULT (''),
                "listExclusions" boolean NOT NULL DEFAULT (0),
                "forceSeerr" boolean NOT NULL DEFAULT (0),
                "addDate" date DEFAULT (CURRENT_TIMESTAMP),
                "handledMediaAmount" integer NOT NULL DEFAULT (0),
                "lastDurationInSeconds" integer NOT NULL DEFAULT (0),
                "keepLogsForMonths" integer NOT NULL DEFAULT (6),
                "tautulliWatchedPercentOverride" integer,
                "radarrSettingsId" integer,
                "sonarrSettingsId" integer,
                "visibleOnRecommended" boolean NOT NULL DEFAULT (0),
                "sortTitle" varchar,
                "mediaServerId" varchar,
                "mediaServerType" varchar NOT NULL DEFAULT ('plex'),
                "totalSizeBytes" bigint,
                "radarrQualityProfileId" integer,
                "sonarrQualityProfileId" integer,
                "overlayEnabled" boolean NOT NULL DEFAULT (0),
                "overlayTemplateId" integer,
                "handledMediaSizeBytes" bigint NOT NULL DEFAULT (0),
                "mediaServerSort" varchar,
                "tagInArr" boolean NOT NULL DEFAULT (0),
                "sportarrSettingsId" integer,
                "sportarrQualityProfileId" integer,
                "cleanupLeftoverFolders" boolean NOT NULL DEFAULT (0),
                "requiredApprovals" integer NOT NULL DEFAULT (0),
                CONSTRAINT "FK_b638046ca16fca4108a7981fd8c" FOREIGN KEY ("sonarrSettingsId") REFERENCES "sonarr_settings" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_7b354cc91e78c8e730465f14f69" FOREIGN KEY ("radarrSettingsId") REFERENCES "radarr_settings" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_9d81b59ef584c1072c2bcbcccb7" FOREIGN KEY ("overlayTemplateId") REFERENCES "overlay_templates" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_8f739be8839c72b5313069501ea" FOREIGN KEY ("sportarrSettingsId") REFERENCES "sportarr_settings" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_collection"(
                    "id",
                    "libraryId",
                    "title",
                    "description",
                    "isActive",
                    "arrAction",
                    "visibleOnHome",
                    "deleteAfterDays",
                    "type",
                    "manualCollection",
                    "manualCollectionName",
                    "listExclusions",
                    "forceSeerr",
                    "addDate",
                    "handledMediaAmount",
                    "lastDurationInSeconds",
                    "keepLogsForMonths",
                    "tautulliWatchedPercentOverride",
                    "radarrSettingsId",
                    "sonarrSettingsId",
                    "visibleOnRecommended",
                    "sortTitle",
                    "mediaServerId",
                    "mediaServerType",
                    "totalSizeBytes",
                    "radarrQualityProfileId",
                    "sonarrQualityProfileId",
                    "overlayEnabled",
                    "overlayTemplateId",
                    "handledMediaSizeBytes",
                    "mediaServerSort",
                    "tagInArr",
                    "sportarrSettingsId",
                    "sportarrQualityProfileId",
                    "cleanupLeftoverFolders"
                )
            SELECT "id",
                "libraryId",
                "title",
                "description",
                "isActive",
                "arrAction",
                "visibleOnHome",
                "deleteAfterDays",
                "type",
                "manualCollection",
                "manualCollectionName",
                "listExclusions",
                "forceSeerr",
                "addDate",
                "handledMediaAmount",
                "lastDurationInSeconds",
                "keepLogsForMonths",
                "tautulliWatchedPercentOverride",
                "radarrSettingsId",
                "sonarrSettingsId",
                "visibleOnRecommended",
                "sortTitle",
                "mediaServerId",
                "mediaServerType",
                "totalSizeBytes",
                "radarrQualityProfileId",
                "sonarrQualityProfileId",
                "overlayEnabled",
                "overlayTemplateId",
                "handledMediaSizeBytes",
                "mediaServerSort",
                "tagInArr",
                "sportarrSettingsId",
                "sportarrQualityProfileId",
                "cleanupLeftoverFolders"
            FROM "collection"
        `);
    await queryRunner.query(`
            DROP TABLE "collection"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_collection"
                RENAME TO "collection"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_92f69700771624e228094e87cd"
        `);
    await queryRunner.query(`
            CREATE TABLE "temporary_collection_media_approval" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "collectionMediaId" integer NOT NULL,
                "userId" integer NOT NULL,
                "decision" integer NOT NULL DEFAULT (0),
                "decidedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
                CONSTRAINT "FK_9b2ffe8b3b216ed297ba8edc6df" FOREIGN KEY ("collectionMediaId") REFERENCES "collection_media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "temporary_collection_media_approval"(
                    "id",
                    "collectionMediaId",
                    "userId",
                    "decision",
                    "decidedAt"
                )
            SELECT "id",
                "collectionMediaId",
                "userId",
                "decision",
                "decidedAt"
            FROM "collection_media_approval"
        `);
    await queryRunner.query(`
            DROP TABLE "collection_media_approval"
        `);
    await queryRunner.query(`
            ALTER TABLE "temporary_collection_media_approval"
                RENAME TO "collection_media_approval"
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_92f69700771624e228094e87cd" ON "collection_media_approval" ("collectionMediaId", "userId")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "IDX_92f69700771624e228094e87cd"
        `);
    await queryRunner.query(`
            ALTER TABLE "collection_media_approval"
                RENAME TO "temporary_collection_media_approval"
        `);
    await queryRunner.query(`
            CREATE TABLE "collection_media_approval" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "collectionMediaId" integer NOT NULL,
                "userId" integer NOT NULL,
                "decision" integer NOT NULL DEFAULT (0),
                "decidedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            )
        `);
    await queryRunner.query(`
            INSERT INTO "collection_media_approval"(
                    "id",
                    "collectionMediaId",
                    "userId",
                    "decision",
                    "decidedAt"
                )
            SELECT "id",
                "collectionMediaId",
                "userId",
                "decision",
                "decidedAt"
            FROM "temporary_collection_media_approval"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_collection_media_approval"
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_92f69700771624e228094e87cd" ON "collection_media_approval" ("collectionMediaId", "userId")
        `);
    await queryRunner.query(`
            ALTER TABLE "collection"
                RENAME TO "temporary_collection"
        `);
    await queryRunner.query(`
            CREATE TABLE "collection" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "libraryId" varchar NOT NULL,
                "title" varchar NOT NULL,
                "description" varchar,
                "isActive" boolean NOT NULL DEFAULT (1),
                "arrAction" integer NOT NULL DEFAULT (0),
                "visibleOnHome" boolean NOT NULL DEFAULT (0),
                "deleteAfterDays" integer,
                "type" varchar NOT NULL DEFAULT ('movie'),
                "manualCollection" boolean NOT NULL DEFAULT (0),
                "manualCollectionName" varchar DEFAULT (''),
                "listExclusions" boolean NOT NULL DEFAULT (0),
                "forceSeerr" boolean NOT NULL DEFAULT (0),
                "addDate" date DEFAULT (CURRENT_TIMESTAMP),
                "handledMediaAmount" integer NOT NULL DEFAULT (0),
                "lastDurationInSeconds" integer NOT NULL DEFAULT (0),
                "keepLogsForMonths" integer NOT NULL DEFAULT (6),
                "tautulliWatchedPercentOverride" integer,
                "radarrSettingsId" integer,
                "sonarrSettingsId" integer,
                "visibleOnRecommended" boolean NOT NULL DEFAULT (0),
                "sortTitle" varchar,
                "mediaServerId" varchar,
                "mediaServerType" varchar NOT NULL DEFAULT ('plex'),
                "totalSizeBytes" bigint,
                "radarrQualityProfileId" integer,
                "sonarrQualityProfileId" integer,
                "overlayEnabled" boolean NOT NULL DEFAULT (0),
                "overlayTemplateId" integer,
                "handledMediaSizeBytes" bigint NOT NULL DEFAULT (0),
                "mediaServerSort" varchar,
                "tagInArr" boolean NOT NULL DEFAULT (0),
                "sportarrSettingsId" integer,
                "sportarrQualityProfileId" integer,
                "cleanupLeftoverFolders" boolean NOT NULL DEFAULT (0),
                CONSTRAINT "FK_b638046ca16fca4108a7981fd8c" FOREIGN KEY ("sonarrSettingsId") REFERENCES "sonarr_settings" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_7b354cc91e78c8e730465f14f69" FOREIGN KEY ("radarrSettingsId") REFERENCES "radarr_settings" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_9d81b59ef584c1072c2bcbcccb7" FOREIGN KEY ("overlayTemplateId") REFERENCES "overlay_templates" ("id") ON DELETE
                SET NULL ON UPDATE NO ACTION,
                    CONSTRAINT "FK_8f739be8839c72b5313069501ea" FOREIGN KEY ("sportarrSettingsId") REFERENCES "sportarr_settings" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "collection"(
                    "id",
                    "libraryId",
                    "title",
                    "description",
                    "isActive",
                    "arrAction",
                    "visibleOnHome",
                    "deleteAfterDays",
                    "type",
                    "manualCollection",
                    "manualCollectionName",
                    "listExclusions",
                    "forceSeerr",
                    "addDate",
                    "handledMediaAmount",
                    "lastDurationInSeconds",
                    "keepLogsForMonths",
                    "tautulliWatchedPercentOverride",
                    "radarrSettingsId",
                    "sonarrSettingsId",
                    "visibleOnRecommended",
                    "sortTitle",
                    "mediaServerId",
                    "mediaServerType",
                    "totalSizeBytes",
                    "radarrQualityProfileId",
                    "sonarrQualityProfileId",
                    "overlayEnabled",
                    "overlayTemplateId",
                    "handledMediaSizeBytes",
                    "mediaServerSort",
                    "tagInArr",
                    "sportarrSettingsId",
                    "sportarrQualityProfileId",
                    "cleanupLeftoverFolders"
                )
            SELECT "id",
                "libraryId",
                "title",
                "description",
                "isActive",
                "arrAction",
                "visibleOnHome",
                "deleteAfterDays",
                "type",
                "manualCollection",
                "manualCollectionName",
                "listExclusions",
                "forceSeerr",
                "addDate",
                "handledMediaAmount",
                "lastDurationInSeconds",
                "keepLogsForMonths",
                "tautulliWatchedPercentOverride",
                "radarrSettingsId",
                "sonarrSettingsId",
                "visibleOnRecommended",
                "sortTitle",
                "mediaServerId",
                "mediaServerType",
                "totalSizeBytes",
                "radarrQualityProfileId",
                "sonarrQualityProfileId",
                "overlayEnabled",
                "overlayTemplateId",
                "handledMediaSizeBytes",
                "mediaServerSort",
                "tagInArr",
                "sportarrSettingsId",
                "sportarrQualityProfileId",
                "cleanupLeftoverFolders"
            FROM "temporary_collection"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_collection"
        `);
    await queryRunner.query(`
            DROP INDEX "idx_collection_media_collection_id"
        `);
    await queryRunner.query(`
            ALTER TABLE "collection_media"
                RENAME TO "temporary_collection_media"
        `);
    await queryRunner.query(`
            CREATE TABLE "collection_media" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "collectionId" integer NOT NULL,
                "mediaServerId" varchar NOT NULL,
                "tmdbId" integer,
                "addDate" datetime NOT NULL,
                "image_path" varchar,
                "isManual" boolean DEFAULT (0),
                "tvdbId" integer,
                "includedByRule" boolean,
                "manualMembershipSource" varchar,
                "sizeBytes" bigint,
                "ruleEvaluationFailed" boolean NOT NULL DEFAULT (0),
                CONSTRAINT "FK_604b0cd0f85150923289b7f2c19" FOREIGN KEY ("collectionId") REFERENCES "collection" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    await queryRunner.query(`
            INSERT INTO "collection_media"(
                    "id",
                    "collectionId",
                    "mediaServerId",
                    "tmdbId",
                    "addDate",
                    "image_path",
                    "isManual",
                    "tvdbId",
                    "includedByRule",
                    "manualMembershipSource",
                    "sizeBytes",
                    "ruleEvaluationFailed"
                )
            SELECT "id",
                "collectionId",
                "mediaServerId",
                "tmdbId",
                "addDate",
                "image_path",
                "isManual",
                "tvdbId",
                "includedByRule",
                "manualMembershipSource",
                "sizeBytes",
                "ruleEvaluationFailed"
            FROM "temporary_collection_media"
        `);
    await queryRunner.query(`
            DROP TABLE "temporary_collection_media"
        `);
    await queryRunner.query(`
            CREATE INDEX "idx_collection_media_collection_id" ON "collection_media" ("collectionId")
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_92f69700771624e228094e87cd"
        `);
    await queryRunner.query(`
            DROP TABLE "collection_media_approval"
        `);
  }
}
