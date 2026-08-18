import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Consultation,
  ConsultationConsent,
  AudioSession,
  TranscriptSegment,
  ClinicalExtraction,
  ClinicalNote,
  Patient,
  User,
} from '@entities/index';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { ConsultationConsentService } from './services/consultation-consent.service';
import { AudioSessionService } from './services/audio-session.service';
import { TranscriptService } from './services/transcript.service';
import { ClinicalExtractionService } from './services/clinical-extraction.service';
import { ClinicalNotesService } from './services/clinical-notes.service';
import { AudioUploadOrchestratorService } from './services/audio-upload-orchestrator.service';
import { TRANSCRIPTION_PROVIDER } from './services/transcription/transcription-provider.interface';
import { MockTranscriptionProvider } from './services/transcription/mock-transcription.provider';
import { PatientsModule } from '../patients/patients.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Consultation,
      ConsultationConsent,
      AudioSession,
      TranscriptSegment,
      ClinicalExtraction,
      ClinicalNote,
      Patient,
      User,
    ]),
    PatientsModule,
    UsersModule,
  ],
  providers: [
    ConsultationsService,
    ConsultationConsentService,
    AudioSessionService,
    TranscriptService,
    ClinicalExtractionService,
    ClinicalNotesService,
    AudioUploadOrchestratorService,
    { provide: TRANSCRIPTION_PROVIDER, useClass: MockTranscriptionProvider },
  ],
  controllers: [ConsultationsController],
  exports: [
    ConsultationsService,
    ConsultationConsentService,
    AudioSessionService,
    TranscriptService,
    ClinicalExtractionService,
    ClinicalNotesService,
  ],
})
export class ConsultationsModule {}
