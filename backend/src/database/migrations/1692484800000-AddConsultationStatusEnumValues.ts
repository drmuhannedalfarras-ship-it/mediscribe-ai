import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConsultationStatusEnumValues1692484800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "consultation_status_enum" ADD VALUE IF NOT EXISTS 'PROCESSING'`);
    await queryRunner.query(`ALTER TYPE "consultation_status_enum" ADD VALUE IF NOT EXISTS 'AI_REVIEW_READY'`);
    await queryRunner.query(`ALTER TYPE "consultation_status_enum" ADD VALUE IF NOT EXISTS 'PHYSICIAN_REVIEW'`);
    await queryRunner.query(`ALTER TYPE "consultation_status_enum" ADD VALUE IF NOT EXISTS 'FINALIZED'`);
  }

  public async down(): Promise<void> {
    // Postgres does not support removing enum values; reverting requires recreating the type.
  }
}
