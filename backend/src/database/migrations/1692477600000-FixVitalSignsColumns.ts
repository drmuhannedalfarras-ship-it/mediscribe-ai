import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FixVitalSignsColumns1692477600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn('vital_signs', 'systolic', 'systolicBP');
    await queryRunner.renameColumn('vital_signs', 'diastolic', 'diastolicBP');
    await queryRunner.renameColumn('vital_signs', 'heartRate', 'pulse');
    await queryRunner.renameColumn('vital_signs', 'oxygenSaturation', 'spO2');
    await queryRunner.renameColumn('vital_signs', 'recordedAt', 'measuredAt');

    await queryRunner.addColumns('vital_signs', [
      new TableColumn({ name: 'recordedById', type: 'uuid', isNullable: true }),
      new TableColumn({ name: 'notes', type: 'text', isNullable: true }),
      new TableColumn({ name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }),
    ]);

    await queryRunner.query(
      `ALTER TABLE "vital_signs" ADD CONSTRAINT "FK_vital_signs_recordedById" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vital_signs" DROP CONSTRAINT "FK_vital_signs_recordedById"`);
    await queryRunner.dropColumns('vital_signs', ['updatedAt', 'notes', 'recordedById']);

    await queryRunner.renameColumn('vital_signs', 'measuredAt', 'recordedAt');
    await queryRunner.renameColumn('vital_signs', 'spO2', 'oxygenSaturation');
    await queryRunner.renameColumn('vital_signs', 'pulse', 'heartRate');
    await queryRunner.renameColumn('vital_signs', 'diastolicBP', 'diastolic');
    await queryRunner.renameColumn('vital_signs', 'systolicBP', 'systolic');
  }
}
