import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Consultation,
  PatientMedication,
  PatientAllergy,
  VitalSigns,
  Patient,
} from '@entities/index';
import { ClinicalManagementService } from './clinical-management.service';
import { MedicationManagementService } from './services/medication-management.service';
import { TreatmentPlanningService } from './services/treatment-planning.service';
import { MonitoringAndFollowUpService } from './services/monitoring-and-follow-up.service';
import { MedicationSafetyService } from './services/medication-safety.service';
import { ClinicalManagementController } from './clinical-management.controller';
import { PatientsModule } from '../patients/patients.module';
import { ConsultationsModule } from '../consultations/consultations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Consultation,
      PatientMedication,
      PatientAllergy,
      VitalSigns,
      Patient,
    ]),
    PatientsModule,
    ConsultationsModule,
  ],
  providers: [
    ClinicalManagementService,
    MedicationManagementService,
    TreatmentPlanningService,
    MonitoringAndFollowUpService,
    MedicationSafetyService,
  ],
  controllers: [ClinicalManagementController],
  exports: [
    ClinicalManagementService,
    MedicationManagementService,
    TreatmentPlanningService,
    MonitoringAndFollowUpService,
    MedicationSafetyService,
  ],
})
export class ClinicalManagementModule {}
