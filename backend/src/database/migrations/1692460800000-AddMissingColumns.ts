import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMissingColumns1692460800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "consultation_status_enum" ADD VALUE IF NOT EXISTS 'AMENDED'`,
    );

    await queryRunner.addColumns('consultations', [
      new TableColumn({
        name: 'finalizedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);

    await queryRunner.addColumns('clinical_notes', [
      new TableColumn({
        name: 'amendments',
        type: 'jsonb',
        isNullable: true,
      }),
      new TableColumn({
        name: 'modifiedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);

    await queryRunner.addColumns('audio_sessions', [
      new TableColumn({
        name: 'wordCount',
        type: 'integer',
        isNullable: true,
      }),
      new TableColumn({
        name: 'processedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('audio_sessions', 'processedAt');
    await queryRunner.dropColumn('audio_sessions', 'wordCount');
    await queryRunner.dropColumn('clinical_notes', 'modifiedAt');
    await queryRunner.dropColumn('clinical_notes', 'amendments');
    await queryRunner.dropColumn('consultations', 'finalizedAt');
    // Note: Postgres does not support removing a value from an enum type;
    // reverting the AMENDED enum value requires recreating the type manually.
  }
}
