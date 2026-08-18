import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FixConsultationColumns1692481200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn('consultations', 'scheduledAt', 'consultationDate');
    await queryRunner.addColumns('consultations', [
      new TableColumn({ name: 'endTime', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'durationSeconds', type: 'int', isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('consultations', ['durationSeconds', 'endTime']);
    await queryRunner.renameColumn('consultations', 'consultationDate', 'scheduledAt');
  }
}
