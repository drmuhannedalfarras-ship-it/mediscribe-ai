import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMissingPatientColumns1692470400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // patients: rename phone -> phoneNumber, add remaining CreatePatientDto fields
    await queryRunner.renameColumn('patients', 'phone', 'phoneNumber');
    await queryRunner.addColumns('patients', [
      new TableColumn({ name: 'patientId', type: 'varchar', isUnique: true }),
      new TableColumn({ name: 'nationality', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'state', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'postalCode', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'emergencyContact', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'emergencyContactPhone', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'bloodType', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'familyHistory', type: 'text', isNullable: true }),
      new TableColumn({ name: 'socialHistory', type: 'text', isNullable: true }),
      new TableColumn({ name: 'smokingStatus', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'notes', type: 'text', isNullable: true }),
    ]);

    // patient_allergies
    await queryRunner.addColumns('patient_allergies', [
      new TableColumn({ name: 'onsetDate', type: 'date', isNullable: true }),
      new TableColumn({ name: 'isActive', type: 'boolean', default: true }),
    ]);

    // patient_medications: rename dosage -> dose, add missing fields, replace isActive with a status enum
    await queryRunner.renameColumn('patient_medications', 'dosage', 'dose');
    await queryRunner.addColumns('patient_medications', [
      new TableColumn({ name: 'genericName', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'strength', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'dosageForm', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'prescriber', type: 'varchar', isNullable: true }),
    ]);
    await queryRunner.query(
      `CREATE TYPE "medication_status_enum" AS ENUM('ACTIVE', 'DISCONTINUED', 'SUSPENDED', 'COMPLETED')`,
    );
    await queryRunner.addColumn(
      'patient_medications',
      new TableColumn({
        name: 'status',
        type: 'medication_status_enum',
        default: `'ACTIVE'`,
      }),
    );
    await queryRunner.dropColumn('patient_medications', 'isActive');

    // patient_conditions
    await queryRunner.addColumns('patient_conditions', [
      new TableColumn({ name: 'snomedCode', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'resolutionDate', type: 'timestamp', isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('patient_conditions', ['snomedCode', 'resolutionDate']);

    await queryRunner.addColumn(
      'patient_medications',
      new TableColumn({ name: 'isActive', type: 'boolean', default: true }),
    );
    await queryRunner.dropColumn('patient_medications', 'status');
    await queryRunner.query(`DROP TYPE "medication_status_enum"`);
    await queryRunner.dropColumns('patient_medications', [
      'genericName',
      'strength',
      'dosageForm',
      'prescriber',
    ]);
    await queryRunner.renameColumn('patient_medications', 'dose', 'dosage');

    await queryRunner.dropColumns('patient_allergies', ['onsetDate', 'isActive']);

    await queryRunner.dropColumns('patients', [
      'patientId',
      'nationality',
      'state',
      'postalCode',
      'emergencyContact',
      'emergencyContactPhone',
      'bloodType',
      'familyHistory',
      'socialHistory',
      'smokingStatus',
      'notes',
    ]);
    await queryRunner.renameColumn('patients', 'phoneNumber', 'phone');
  }
}
