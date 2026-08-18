import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '@config/database.config';
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
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { PatientsModule } from '@modules/patients/patients.module';
import { ConsultationsModule } from '@modules/consultations/consultations.module';
import { ClinicalDecisionSupportModule } from '@modules/clinical-decision-support/clinical-decision-support.module';
import { ClinicalManagementModule } from '@modules/clinical-management/clinical-management.module';
import { HealthModule } from '@modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([
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
    ]),

    // Features (Phase 1A: Auth & Users)
    HealthModule,
    AuthModule,
    UsersModule,
    // Phase 1B: Patient Management
    PatientsModule,
    // Phase 1C: Consultations & Audio
    ConsultationsModule,
    // Phase 2: Clinical Decision Support
    ClinicalDecisionSupportModule,
    // Phase 3: Clinical Management
    ClinicalManagementModule,
    // Phase 3D+ (To be implemented)
    // AudioModule,
    // AuditModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
