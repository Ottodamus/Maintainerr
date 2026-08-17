import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlexMirrorSites1786736129365 implements MigrationInterface {
  name = 'AddPlexMirrorSites1786736129365';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "plex_mirror_site" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "siteName" varchar NOT NULL,
                "url" varchar NOT NULL,
                "token" varchar NOT NULL,
                "librarySectionId" varchar NOT NULL
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "plex_mirror_site"
        `);
  }
}
