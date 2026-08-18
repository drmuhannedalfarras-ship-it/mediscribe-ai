import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConsentStatusEnumValues1692492000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "consent_status_enum" ADD VALUE IF NOT EXISTS 'PENDING'`);
    await queryRunner.query(`ALTER TYPE "consent_status_enum" ADD VALUE IF NOT EXISTS 'WITHDRAWN'`);
  }

  public async down(): Promise<void> {
    // Postgres does not support removing enum values; reverting requires recreating the type.
  }
}
