import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientAllergy, AllergySeverity } from '@entities/index';
import { Patient } from '@entities/patient.entity';

@Injectable()
export class AllergiesService {
  private readonly logger = new Logger(AllergiesService.name);

  constructor(
    @InjectRepository(PatientAllergy)
    private readonly allergyRepository: Repository<PatientAllergy>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  /**
   * Add allergy to patient
   */
  async addAllergy(
    patientId: string,
    allergen: string,
    severity: AllergySeverity,
    reaction?: string,
  ): Promise<PatientAllergy> {
    if (!allergen || !severity) {
      throw new BadRequestException('Allergen and severity are required');
    }

    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    const allergy = this.allergyRepository.create({
      patient,
      allergen: allergen.trim(),
      severity,
      reaction,
      onsetDate: new Date(),
      isActive: true,
    });

    await this.allergyRepository.save(allergy);

    this.logger.log(`Allergy added for patient ${patientId}: ${allergen}`);

    return allergy;
  }

  /**
   * Get all allergies for a patient
   */
  async getPatientAllergies(patientId: string): Promise<PatientAllergy[]> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    return this.allergyRepository.find({
      where: { patientId, isActive: true },
      order: { severity: 'DESC' },
    });
  }

  /**
   * Update allergy
   */
  async updateAllergy(
    allergyId: string,
    patientId: string,
    allergen?: string,
    severity?: AllergySeverity,
    reaction?: string,
  ): Promise<PatientAllergy> {
    const allergy = await this.allergyRepository.findOne({
      where: { id: allergyId, patientId },
    });

    if (!allergy) {
      throw new NotFoundException(`Allergy not found`);
    }

    if (allergen) {
      allergy.allergen = allergen.trim();
    }
    if (severity) {
      allergy.severity = severity;
    }
    if (reaction !== undefined) {
      allergy.reaction = reaction;
    }

    await this.allergyRepository.save(allergy);

    this.logger.log(`Allergy updated: ${allergyId}`);

    return allergy;
  }

  /**
   * Remove allergy (soft delete)
   */
  async removeAllergy(allergyId: string, patientId: string): Promise<void> {
    const allergy = await this.allergyRepository.findOne({
      where: { id: allergyId, patientId },
    });

    if (!allergy) {
      throw new NotFoundException(`Allergy not found`);
    }

    allergy.isActive = false;
    await this.allergyRepository.save(allergy);

    this.logger.log(`Allergy removed: ${allergyId}`);
  }

  /**
   * Check for critical allergies
   */
  async hasCriticalAllergies(patientId: string): Promise<boolean> {
    const criticalCount = await this.allergyRepository.count({
      where: {
        patientId,
        isActive: true,
        severity: AllergySeverity.CRITICAL,
      },
    });

    return criticalCount > 0;
  }
}
