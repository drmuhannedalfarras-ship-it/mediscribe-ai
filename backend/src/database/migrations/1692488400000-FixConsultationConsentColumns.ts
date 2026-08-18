import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FixConsultationConsentColumns1692488400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('consultation_consents', [
      new TableColumn({ name: 'consentText', type: 'text', isNullable: true }),
      new TableColumn({ name: 'consentGivenAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'consentDeclinedAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'consentWithdrawnAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }),
      new TableColumn({ name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' }),
    ]);

    // Not modeled on the entity, but declared NOT NULL with no default in the original
    // migration; relax so entity-driven inserts (which never set them) don't fail.
    await queryRunner.query(
      `ALTER TABLE "consultation_consents" ALTER COLUMN "patientId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation_consents" ALTER COLUMN "consentType" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "consultation_consents" ALTER COLUMN "consentType" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation_consents" ALTER COLUMN "patientId" SET NOT NULL`,
    );
    await queryRunner.dropColumns('consultation_consents', [
      'updatedAt',
      'createdAt',
      'consentWithdrawnAt',
      'consentDeclinedAt',
      'consentGivenAt',
      'consentText',
    ]);
  }
}
