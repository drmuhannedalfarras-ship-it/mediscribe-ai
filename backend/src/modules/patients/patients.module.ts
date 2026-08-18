import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Patient,
  PatientAllergy,
  PatientMedication,
  PatientCondition,
  VitalSigns,
  User,
} from '@entities/index';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { AllergiesService } from './services/allergies.service';
import { MedicationsService } from './services/medications.service';
import { ConditionsService } from './services/conditions.service';
import { VitalSignsService } from './services/vital-signs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient,
      PatientAllergy,
      PatientMedication,
      PatientCondition,
      VitalSigns,
      User,
    ]),
  ],
  providers: [
    PatientsService,
    AllergiesService,
    MedicationsService,
    ConditionsService,
    VitalSignsService,
  ],
  controllers: [PatientsController],
  exports: [
    PatientsService,
    AllergiesService,
    MedicationsService,
    ConditionsService,
    VitalSignsService,
  ],
})
export class PatientsModule {}
