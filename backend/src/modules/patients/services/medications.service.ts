import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientMedication, MedicationStatus } from '@entities/index';
import { Patient } from '@entities/patient.entity';

@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(
    @InjectRepository(PatientMedication)
    private readonly medicationRepository: Repository<PatientMedication>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  /**
   * Add medication to patient
   */
  async addMedication(
    patientId: string,
    medicationName: string,
    dose?: string,
    frequency?: string,
    indication?: string,
  ): Promise<PatientMedication> {
    if (!medicationName) {
      throw new BadRequestException('Medication name is required');
    }

    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    const medication = this.medicationRepository.create({
      patient,
      medicationName: medicationName.trim(),
      dose,
      frequency,
      indication,
      status: MedicationStatus.ACTIVE,
      startDate: new Date(),
    });

    await this.medicationRepository.save(medication);

    this.logger.log(`Medication added for patient ${patientId}: ${medicationName}`);

    return medication;
  }

  /**
   * Get active medications for a patient
   */
  async getActivePatientMedications(patientId: string): Promise<PatientMedication[]> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    return this.medicationRepository.find({
      where: { patientId, status: MedicationStatus.ACTIVE },
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Get all medications for a patient (including discontinued)
   */
  async getPatientMedications(patientId: string): Promise<PatientMedication[]> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    return this.medicationRepository.find({
      where: { patientId },
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Update medication
   */
  async updateMedication(
    medicationId: string,
    patientId: string,
    medicationName?: string,
    dose?: string,
    frequency?: string,
    indication?: string,
  ): Promise<PatientMedication> {
    const medication = await this.medicationRepository.findOne({
      where: { id: medicationId, patientId },
    });

    if (!medication) {
      throw new NotFoundException(`Medication not found`);
    }

    if (medicationName) {
      medication.medicationName = medicationName.trim();
    }
    if (dose) {
      medication.dose = dose;
    }
    if (frequency) {
      medication.frequency = frequency;
    }
    if (indication) {
      medication.indication = indication;
    }

    await this.medicationRepository.save(medication);

    this.logger.log(`Medication updated: ${medicationId}`);

    return medication;
  }

  /**
   * Discontinue medication
   */
  async discontinueMedication(
    medicationId: string,
    patientId: string,
  ): Promise<PatientMedication> {
    const medication = await this.medicationRepository.findOne({
      where: { id: medicationId, patientId },
    });

    if (!medication) {
      throw new NotFoundException(`Medication not found`);
    }

    medication.status = MedicationStatus.DISCONTINUED;
    medication.endDate = new Date();
    await this.medicationRepository.save(medication);

    this.logger.log(`Medication discontinued: ${medicationId}`);

    return medication;
  }

  /**
   * Suspend medication
   */
  async suspendMedication(
    medicationId: string,
    patientId: string,
  ): Promise<PatientMedication> {
    const medication = await this.medicationRepository.findOne({
      where: { id: medicationId, patientId },
    });

    if (!medication) {
      throw new NotFoundException(`Medication not found`);
    }

    medication.status = MedicationStatus.SUSPENDED;
    await this.medicationRepository.save(medication);

    this.logger.log(`Medication suspended: ${medicationId}`);

    return medication;
  }

  /**
   * Resume medication
   */
  async resumeMedication(
    medicationId: string,
    patientId: string,
  ): Promise<PatientMedication> {
    const medication = await this.medicationRepository.findOne({
      where: { id: medicationId, patientId },
    });

    if (!medication) {
      throw new NotFoundException(`Medication not found`);
    }

    medication.status = MedicationStatus.ACTIVE;
    await this.medicationRepository.save(medication);

    this.logger.log(`Medication resumed: ${medicationId}`);

    return medication;
  }
}
