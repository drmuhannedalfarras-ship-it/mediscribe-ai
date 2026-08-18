import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class RebuildAudioAndTranscriptTables1692495600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Both tables are empty and drifted from their entities on nearly every
    // column (renamed + missing) — recreate from the entity definitions
    // rather than a long, error-prone sequence of ALTERs.
    await queryRunner.dropTable('transcript_segments', true);
    await queryRunner.dropTable('audio_sessions', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "audio_sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transcript_segments_speaker_enum"`);

    await queryRunner.query(
      `CREATE TYPE "audio_sessions_status_enum" AS ENUM('PENDING', 'RECORDING', 'RECORDED', 'PROCESSING', 'PROCESSED', 'FAILED', 'ARCHIVED')`,
    );
    await queryRunner.createTable(
      new Table({
        name: 'audio_sessions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'consultationId', type: 'uuid', isUnique: true },
          {
            name: 'status',
            type: 'audio_sessions_status_enum',
            default: `'PENDING'`,
          },
          { name: 'audioFileUrl', type: 'varchar', isNullable: true },
          { name: 'audioFileSize', type: 'int', isNullable: true },
          { name: 'audioFormat', type: 'varchar', isNullable: true },
          { name: 'audioCodec', type: 'varchar', isNullable: true },
          { name: 'sampleRate', type: 'int', isNullable: true },
          { name: 'durationSeconds', type: 'int', isNullable: true },
          { name: 'recordingStartedAt', type: 'timestamp', isNullable: true },
          { name: 'recordingEndedAt', type: 'timestamp', isNullable: true },
          { name: 'physicianMicrophoneInput', type: 'varchar', isNullable: true },
          { name: 'patientMicrophoneInput', type: 'varchar', isNullable: true },
          { name: 'speakerDiarizationEnabled', type: 'boolean', default: true },
          { name: 'noiseReductionEnabled', type: 'boolean', default: true },
          { name: 'processingNotes', type: 'varchar', isNullable: true },
          { name: 'errorMessage', type: 'varchar', isNullable: true },
          { name: 'wordCount', type: 'int', isNullable: true },
          { name: 'processedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'audio_sessions',
      new TableForeignKey({
        columnNames: ['consultationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'consultations',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.query(
      `CREATE TYPE "transcript_segments_speaker_enum" AS ENUM('PHYSICIAN', 'PATIENT', 'UNKNOWN')`,
    );
    await queryRunner.createTable(
      new Table({
        name: 'transcript_segments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'consultationId', type: 'uuid' },
          { name: 'sequenceNumber', type: 'int' },
          {
            name: 'speaker',
            type: 'transcript_segments_speaker_enum',
            default: `'UNKNOWN'`,
          },
          { name: 'text', type: 'text' },
          { name: 'startTimestamp', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'endTimestamp', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'confidence', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'speakerConfidence', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'correctedText', type: 'varchar', isNullable: true },
          { name: 'isManuallyEdited', type: 'boolean', default: false },
          { name: 'metadata', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'transcript_segments',
      new TableForeignKey({
        columnNames: ['consultationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'consultations',
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createIndex(
      'transcript_segments',
      new TableIndex({
        columnNames: ['consultationId', 'sequenceNumber'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transcript_segments', true);
    await queryRunner.dropTable('audio_sessions', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "transcript_segments_speaker_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audio_sessions_status_enum"`);
  }
}
