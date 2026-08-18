import 'dotenv/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  User,
  Role,
  Permission,
  UserRole,
  Patient,
  PatientAllergy,
  PatientMedication,
  PatientCondition,
  VitalSigns,
  Consultation,
  ConsultationConsent,
  AudioSession,
  TranscriptSegment,
  ClinicalExtraction,
  ClinicalNote,
  AuditLog,
  ModelVersion,
} from '@entities/index';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'mediscribe_user',
    password: process.env.DB_PASSWORD || 'secure_password_change_me',
    database: process.env.DB_NAME || 'mediscribe',
    entities: [
      User,
      Role,
      Permission,
      UserRole,
      Patient,
      PatientAllergy,
      PatientMedication,
      PatientCondition,
      VitalSigns,
      Consultation,
      ConsultationConsent,
      AudioSession,
      TranscriptSegment,
      ClinicalExtraction,
      ClinicalNote,
      AuditLog,
      ModelVersion,
    ],
    synchronize: process.env.DB_SYNCHRONIZE === 'true' && !isProduction,
    logging: process.env.DB_LOGGING === 'true',
    migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
    migrationsRun: true,
    ssl: process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: isProduction,
        }
      : false,
    extra: {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };
};
