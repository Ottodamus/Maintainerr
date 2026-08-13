import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsers1786629639185 implements MigrationInterface {
  name = 'AddUsers1786629639185';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "user" (
                "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                "plexId" varchar,
                "plexUsername" varchar NOT NULL,
                "email" varchar,
                "thumb" varchar,
                "role" integer NOT NULL DEFAULT (2),
                "allowed" boolean NOT NULL DEFAULT (0),
                "lastLoginAt" datetime,
                "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_5c2a57a62087b97721f2b23067" ON "user" ("plexId")
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_5dc44cf5bc0ffcdbde909b93a8" ON "user" ("plexUsername")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "IDX_5dc44cf5bc0ffcdbde909b93a8"
        `);
    await queryRunner.query(`
            DROP INDEX "IDX_5c2a57a62087b97721f2b23067"
        `);
    await queryRunner.query(`
            DROP TABLE "user"
        `);
  }
}
