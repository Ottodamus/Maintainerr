import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlexMirrorCollectionLink1786989172965 implements MigrationInterface {
  name = 'AddPlexMirrorCollectionLink1786989172965';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "plex_mirror_collection_link" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "plexMirrorSiteId" integer NOT NULL,
                "collectionId" integer NOT NULL,
                "mirrorRatingKey" varchar
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_31ae7d947f91779ce542999eeb" ON "plex_mirror_collection_link" ("plexMirrorSiteId", "collectionId")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "IDX_31ae7d947f91779ce542999eeb"
        `);
    await queryRunner.query(`
            DROP TABLE "plex_mirror_collection_link"
        `);
  }
}
