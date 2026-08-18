import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consultation, ClinicalExtraction, ClinicalNote, PatientAllergy } from '@entities/index';
import { ClinicalDecisionSupportService } from './clinical-decision-support.service';
import { DifferentialDiagnosisService } from './services/differential-diagnosis.service';
import { MissingInformationService } from './services/missing-information.service';
import { InvestigationRecommendationService } from './services/investigation-recommendation.service';
import { EvidenceRetrievalService } from './services/evidence-retrieval.service';
import { RedFlagDetectionService } from './services/red-flag-detection.service';
import { ClinicalDecisionSupportController } from './clinical-decision-support.controller';
import { PatientsModule } from '../patients/patients.module';
import { ConsultationsModule } from '../consultations/consultations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Consultation,
      ClinicalExtraction,
      ClinicalNote,
      PatientAllergy,
    ]),
    PatientsModule,
    ConsultationsModule,
  ],
  providers: [
    ClinicalDecisionSupportService,
    DifferentialDiagnosisService,
    MissingInformationService,
    InvestigationRecommendationService,
    EvidenceRetrievalService,
    RedFlagDetectionService,
  ],
  controllers: [ClinicalDecisionSupportController],
  exports: [
    ClinicalDecisionSupportService,
    DifferentialDiagnosisService,
    MissingInformationService,
    InvestigationRecommendationService,
    EvidenceRetrievalService,
    RedFlagDetectionService,
  ],
})
export class ClinicalDecisionSupportModule {}
