import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class InitialSchema1692374400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Required for uuid_generate_v4() used as column defaults below
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum types
    await queryRunner.query(`CREATE TYPE "user_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED')`);
    await queryRunner.query(`CREATE TYPE "consultation_status_enum" AS ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`);
    await queryRunner.query(`CREATE TYPE "consent_status_enum" AS ENUM('GIVEN', 'DECLINED', 'REVOKED')`);
    await queryRunner.query(`CREATE TYPE "patient_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED')`);
    await queryRunner.query(`CREATE TYPE "allergy_severity_enum" AS ENUM('MILD', 'MODERATE', 'SEVERE')`);

    // 1. Users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'firstName', type: 'varchar' },
          { name: 'lastName', type: 'varchar' },
          { name: 'employeeId', type: 'varchar', isNullable: true },
          { name: 'status', type: 'user_status_enum', default: `'ACTIVE'` },
          { name: 'specialization', type: 'varchar', isNullable: true },
          { name: 'licenseNumber', type: 'varchar', isNullable: true },
          { name: 'department', type: 'varchar', isNullable: true },
          { name: 'passwordHash', type: 'varchar' },
          { name: 'passwordSalt', type: 'varchar', isNullable: true },
          { name: 'lastLoginAt', type: 'timestamp', isNullable: true },
          { name: 'lastPasswordChangeAt', type: 'timestamp', isNullable: true },
          { name: 'mfaEnabled', type: 'boolean', default: false },
          { name: 'mfaSecret', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
    );
    await queryRunner.createIndex('users', new TableIndex({ columnNames: ['email'] }));
    await queryRunner.createIndex('users', new TableIndex({ columnNames: ['status'] }));

    // 2. Roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'isSystem', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    // 3. Permissions table
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'category', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    // 4. User Roles junction table
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'roleId', type: 'uuid' },
          { name: 'assignedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('user_roles', new TableForeignKey({ columnNames: ['userId'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('user_roles', new TableForeignKey({ columnNames: ['roleId'], referencedColumnNames: ['id'], referencedTableName: 'roles', onDelete: 'CASCADE' }));

    // 5. Role Permissions junction table
    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'roleId', type: 'uuid' },
          { name: 'permissionId', type: 'uuid' },
        ],
      }),
    );
    await queryRunner.createForeignKey('role_permissions', new TableForeignKey({ columnNames: ['roleId'], referencedColumnNames: ['id'], referencedTableName: 'roles', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('role_permissions', new TableForeignKey({ columnNames: ['permissionId'], referencedColumnNames: ['id'], referencedTableName: 'permissions', onDelete: 'CASCADE' }));

    // 6. Patients table
    await queryRunner.createTable(
      new Table({
        name: 'patients',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'mrn', type: 'varchar', isUnique: true },
          { name: 'firstName', type: 'varchar' },
          { name: 'lastName', type: 'varchar' },
          { name: 'dateOfBirth', type: 'date' },
          { name: 'gender', type: 'varchar', isNullable: true },
          { name: 'email', type: 'varchar', isNullable: true },
          { name: 'phone', type: 'varchar', isNullable: true },
          { name: 'address', type: 'text', isNullable: true },
          { name: 'city', type: 'varchar', isNullable: true },
          { name: 'country', type: 'varchar', isNullable: true },
          { name: 'status', type: 'patient_status_enum', default: `'ACTIVE'` },
          { name: 'height', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'weight', type: 'decimal', precision: 6, scale: 2, isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
    );
    await queryRunner.createIndex('patients', new TableIndex({ columnNames: ['mrn'] }));
    await queryRunner.createIndex('patients', new TableIndex({ columnNames: ['email'] }));

    // 7. Patient Allergies table
    await queryRunner.createTable(
      new Table({
        name: 'patient_allergies',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'patientId', type: 'uuid' },
          { name: 'allergen', type: 'varchar' },
          { name: 'severity', type: 'allergy_severity_enum', default: `'MILD'` },
          { name: 'reaction', type: 'text', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('patient_allergies', new TableForeignKey({ columnNames: ['patientId'], referencedColumnNames: ['id'], referencedTableName: 'patients', onDelete: 'CASCADE' }));

    // 8. Patient Medications table
    await queryRunner.createTable(
      new Table({
        name: 'patient_medications',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'patientId', type: 'uuid' },
          { name: 'medicationName', type: 'varchar' },
          { name: 'dosage', type: 'varchar', isNullable: true },
          { name: 'frequency', type: 'varchar', isNullable: true },
          { name: 'route', type: 'varchar', isNullable: true },
          { name: 'indication', type: 'text', isNullable: true },
          { name: 'startDate', type: 'date', isNullable: true },
          { name: 'endDate', type: 'date', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('patient_medications', new TableForeignKey({ columnNames: ['patientId'], referencedColumnNames: ['id'], referencedTableName: 'patients', onDelete: 'CASCADE' }));

    // 9. Patient Conditions table
    await queryRunner.createTable(
      new Table({
        name: 'patient_conditions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'patientId', type: 'uuid' },
          { name: 'conditionName', type: 'varchar' },
          { name: 'icdCode', type: 'varchar', isNullable: true },
          { name: 'onsetDate', type: 'date', isNullable: true },
          { name: 'status', type: 'varchar', default: `'ACTIVE'` },
          { name: 'severity', type: 'varchar', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('patient_conditions', new TableForeignKey({ columnNames: ['patientId'], referencedColumnNames: ['id'], referencedTableName: 'patients', onDelete: 'CASCADE' }));

    // 10. Vital Signs table
    await queryRunner.createTable(
      new Table({
        name: 'vital_signs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'patientId', type: 'uuid' },
          { name: 'systolic', type: 'integer', isNullable: true },
          { name: 'diastolic', type: 'integer', isNullable: true },
          { name: 'heartRate', type: 'integer', isNullable: true },
          { name: 'temperature', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'respiratoryRate', type: 'integer', isNullable: true },
          { name: 'oxygenSaturation', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'height', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'weight', type: 'decimal', precision: 6, scale: 2, isNullable: true },
          { name: 'bmi', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'recordedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('vital_signs', new TableForeignKey({ columnNames: ['patientId'], referencedColumnNames: ['id'], referencedTableName: 'patients', onDelete: 'CASCADE' }));
    await queryRunner.createIndex('vital_signs', new TableIndex({ columnNames: ['patientId', 'recordedAt'] }));

    // 11. Consultations table
    await queryRunner.createTable(
      new Table({
        name: 'consultations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'patientId', type: 'uuid' },
          { name: 'physicianId', type: 'uuid' },
          { name: 'department', type: 'varchar', isNullable: true },
          { name: 'specialty', type: 'varchar', isNullable: true },
          { name: 'reasonForVisit', type: 'text', isNullable: true },
          { name: 'status', type: 'consultation_status_enum', default: `'SCHEDULED'` },
          { name: 'scheduledAt', type: 'timestamp', isNullable: true },
          { name: 'startedAt', type: 'timestamp', isNullable: true },
          { name: 'completedAt', type: 'timestamp', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
    );
    await queryRunner.createForeignKey('consultations', new TableForeignKey({ columnNames: ['patientId'], referencedColumnNames: ['id'], referencedTableName: 'patients', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('consultations', new TableForeignKey({ columnNames: ['physicianId'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'RESTRICT' }));
    await queryRunner.createIndex('consultations', new TableIndex({ columnNames: ['patientId'] }));
    await queryRunner.createIndex('consultations', new TableIndex({ columnNames: ['physicianId'] }));
    await queryRunner.createIndex('consultations', new TableIndex({ columnNames: ['status'] }));

    // 12. Consultation Consent table
    await queryRunner.createTable(
      new Table({
        name: 'consultation_consents',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'consultationId', type: 'uuid' },
          { name: 'patientId', type: 'uuid' },
          { name: 'consentType', type: 'varchar' },
          { name: 'status', type: 'consent_status_enum', default: `'GIVEN'` },
          { name: 'consentVersion', type: 'varchar' },
          { name: 'timestamp', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'grantedBy', type: 'uuid', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
        ],
      }),
    );
    await queryRunner.createForeignKey('consultation_consents', new TableForeignKey({ columnNames: ['consultationId'], referencedColumnNames: ['id'], referencedTableName: 'consultations', onDelete: 'CASCADE' }));
    await queryRunner.createForeignKey('consultation_consents', new TableForeignKey({ columnNames: ['patientId'], referencedColumnNames: ['id'], referencedTableName: 'patients', onDelete: 'CASCADE' }));

    // 13. Audio Sessions table
    await queryRunner.createTable(
      new Table({
        name: 'audio_sessions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'consultationId', type: 'uuid' },
          { name: 'audioUrl', type: 'varchar', isNullable: true },
          { name: 'durationSeconds', type: 'integer', isNullable: true },
          { name: 'format', type: 'varchar', isNullable: true },
          { name: 'sampleRate', type: 'integer', isNullable: true },
          { name: 'startTime', type: 'timestamp', isNullable: true },
          { name: 'endTime', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('audio_sessions', new TableForeignKey({ columnNames: ['consultationId'], referencedColumnNames: ['id'], referencedTableName: 'consultations', onDelete: 'CASCADE' }));

    // 14. Transcript Segments table
    await queryRunner.createTable(
      new Table({
        name: 'transcript_segments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'consultationId', type: 'uuid' },
          { name: 'startTime', type: 'decimal', precision: 10, scale: 3, isNullable: true },
          { name: 'endTime', type: 'decimal', precision: 10, scale: 3, isNullable: true },
          { name: 'speaker', type: 'varchar', default: `'UNKNOWN'` },
          { name: 'text', type: 'text' },
          { name: 'confidence', type: 'decimal', precision: 3, scale: 2, isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('transcript_segments', new TableForeignKey({ columnNames: ['consultationId'], referencedColumnNames: ['id'], referencedTableName: 'consultations', onDelete: 'CASCADE' }));

    // 15. Clinical Extractions table
    await queryRunner.createTable(
      new Table({
        name: 'clinical_extractions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'consultationId', type: 'uuid' },
          { name: 'extractionType', type: 'varchar' },
          { name: 'originalContent', type: 'jsonb', isNullable: true },
          { name: 'extractedData', type: 'jsonb', isNullable: true },
          { name: 'confidence', type: 'decimal', precision: 3, scale: 2, isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('clinical_extractions', new TableForeignKey({ columnNames: ['consultationId'], referencedColumnNames: ['id'], referencedTableName: 'consultations', onDelete: 'CASCADE' }));

    // 16. Clinical Notes table
    await queryRunner.createTable(
      new Table({
        name: 'clinical_notes',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'consultationId', type: 'uuid' },
          { name: 'subjective', type: 'text', isNullable: true },
          { name: 'objective', type: 'text', isNullable: true },
          { name: 'assessment', type: 'text', isNullable: true },
          { name: 'plan', type: 'text', isNullable: true },
          { name: 'originalAIContent', type: 'jsonb', isNullable: true },
          { name: 'physicianEdits', type: 'jsonb', isNullable: true },
          { name: 'isApproved', type: 'boolean', default: false },
          { name: 'approvedBy', type: 'uuid', isNullable: true },
          { name: 'approvedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('clinical_notes', new TableForeignKey({ columnNames: ['consultationId'], referencedColumnNames: ['id'], referencedTableName: 'consultations', onDelete: 'CASCADE' }));

    // 17. Audit Logs table
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid', isNullable: true },
          { name: 'action', type: 'varchar' },
          { name: 'entityType', type: 'varchar' },
          { name: 'entityId', type: 'uuid' },
          { name: 'oldValues', type: 'jsonb', isNullable: true },
          { name: 'newValues', type: 'jsonb', isNullable: true },
          { name: 'ipAddress', type: 'varchar', isNullable: true },
          { name: 'userAgent', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );
    await queryRunner.createForeignKey('audit_logs', new TableForeignKey({ columnNames: ['userId'], referencedColumnNames: ['id'], referencedTableName: 'users', onDelete: 'SET NULL' }));
    await queryRunner.createIndex('audit_logs', new TableIndex({ columnNames: ['entityType', 'entityId'] }));
    await queryRunner.createIndex('audit_logs', new TableIndex({ columnNames: ['userId'] }));

    // 18. Model Versions table
    await queryRunner.createTable(
      new Table({
        name: 'model_versions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'modelName', type: 'varchar' },
          { name: 'version', type: 'varchar' },
          { name: 'provider', type: 'varchar' },
          { name: 'config', type: 'jsonb', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
    );

    // Enable UUID extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all tables in reverse order of creation
    await queryRunner.dropTable('model_versions');
    await queryRunner.dropTable('audit_logs');
    await queryRunner.dropTable('clinical_notes');
    await queryRunner.dropTable('clinical_extractions');
    await queryRunner.dropTable('transcript_segments');
    await queryRunner.dropTable('audio_sessions');
    await queryRunner.dropTable('consultation_consents');
    await queryRunner.dropTable('consultations');
    await queryRunner.dropTable('vital_signs');
    await queryRunner.dropTable('patient_conditions');
    await queryRunner.dropTable('patient_medications');
    await queryRunner.dropTable('patient_allergies');
    await queryRunner.dropTable('patients');
    await queryRunner.dropTable('role_permissions');
    await queryRunner.dropTable('user_roles');
    await queryRunner.dropTable('permissions');
    await queryRunner.dropTable('roles');
    await queryRunner.dropTable('users');

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "allergy_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "consent_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "patient_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "consultation_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum"`);
  }
}
