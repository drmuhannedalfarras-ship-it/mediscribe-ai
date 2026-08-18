import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import {
  Consultation,
  ClinicalExtraction,
  PatientMedication,
  AuditLog,
  Patient,
} from '@entities/index';
import { AutonomousOperationsService } from './autonomous-operations.service';
import { OrderPlacementService } from './services/order-placement.service';
import { ClinicalEscalationService } from './services/clinical-escalation.service';
import { NotificationService } from './services/notification.service';
import { RealtimeMonitoringService } from './services/realtime-monitoring.service';
import { AdvancedDecisionService } from './services/advanced-decision.service';
import { AutonomousOperationsController } from './autonomous-operations.controller';
import { PatientsModule } from '../patients/patients.module';
import { ConsultationsModule } from '../consultations/consultations.module';
import { ClinicalManagementModule } from '../clinical-management/clinical-management.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Consultation,
      ClinicalExtraction,
      PatientMedication,
      AuditLog,
      Patient,
    ]),
    BullModule.registerQueue(
      { name: 'orders' },
      { name: 'notifications' },
      { name: 'escalations' },
      { name: 'monitoring' },
    ),
    PatientsModule,
    ConsultationsModule,
    ClinicalManagementModule,
  ],
  providers: [
    AutonomousOperationsService,
    OrderPlacementService,
    ClinicalEscalationService,
    NotificationService,
    RealtimeMonitoringService,
    AdvancedDecisionService,
  ],
  controllers: [AutonomousOperationsController],
  exports: [
    AutonomousOperationsService,
    OrderPlacementService,
    ClinicalEscalationService,
    NotificationService,
    RealtimeMonitoringService,
    AdvancedDecisionService,
  ],
})
export class AutonomousOperationsModule {}
