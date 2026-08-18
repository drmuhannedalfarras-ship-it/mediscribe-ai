import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientCondition, ConditionStatus } from '@entities/index';
import { Patient } from '@entities/patient.entity';

@Injectable()
export class ConditionsService {
  private readonly logger = new Logger(ConditionsService.name);

  constructor(
    @InjectRepository(PatientCondition)
    private readonly conditionRepository: Repository<PatientCondition>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  /**
   * Add condition to patient
   */
  async addCondition(
    patientId: string,
    conditionName: string,
    icdCode?: string,
    severity?: string,
  ): Promise<PatientCondition> {
    if (!conditionName) {
      throw new BadRequestException('Condition name is required');
    }

    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    const condition = this.conditionRepository.create({
      patient,
      conditionName: conditionName.trim(),
      icdCode,
      status: ConditionStatus.ACTIVE,
      onsetDate: new Date(),
      severity,
    });

    await this.conditionRepository.save(condition);

    this.logger.log(`Condition added for patient ${patientId}: ${conditionName}`);

    return condition;
  }

  /**
   * Get active conditions for a patient
   */
  async getActivePatientConditions(patientId: string): Promise<PatientCondition[]> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    return this.conditionRepository.find({
      where: { patientId, status: ConditionStatus.ACTIVE },
      order: { onsetDate: 'DESC' },
    });
  }

  /**
   * Get all conditions for a patient (including resolved)
   */
  async getPatientConditions(patientId: string): Promise<PatientCondition[]> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    return this.conditionRepository.find({
      where: { patientId },
      order: { onsetDate: 'DESC' },
    });
  }

  /**
   * Update condition
   */
  async updateCondition(
    conditionId: string,
    patientId: string,
    conditionName?: string,
    icdCode?: string,
    severity?: string,
  ): Promise<PatientCondition> {
    const condition = await this.conditionRepository.findOne({
      where: { id: conditionId, patientId },
    });

    if (!condition) {
      throw new NotFoundException(`Condition not found`);
    }

    if (conditionName) {
      condition.conditionName = conditionName.trim();
    }
    if (icdCode) {
      condition.icdCode = icdCode;
    }
    if (severity) {
      condition.severity = severity;
    }

    await this.conditionRepository.save(condition);

    this.logger.log(`Condition updated: ${conditionId}`);

    return condition;
  }

  /**
   * Resolve condition
   */
  async resolveCondition(
    conditionId: string,
    patientId: string,
  ): Promise<PatientCondition> {
    const condition = await this.conditionRepository.findOne({
      where: { id: conditionId, patientId },
    });

    if (!condition) {
      throw new NotFoundException(`Condition not found`);
    }

    condition.status = ConditionStatus.RESOLVED;
    condition.resolutionDate = new Date();
    await this.conditionRepository.save(condition);

    this.logger.log(`Condition resolved: ${conditionId}`);

    return condition;
  }

  /**
   * Mark condition as remission
   */
  async markRemission(
    conditionId: string,
    patientId: string,
  ): Promise<PatientCondition> {
    const condition = await this.conditionRepository.findOne({
      where: { id: conditionId, patientId },
    });

    if (!condition) {
      throw new NotFoundException(`Condition not found`);
    }

    condition.status = ConditionStatus.REMISSION;
    await this.conditionRepository.save(condition);

    this.logger.log(`Condition marked as remission: ${conditionId}`);

    return condition;
  }

  /**
   * Reactivate condition
   */
  async reactivateCondition(
    conditionId: string,
    patientId: string,
  ): Promise<PatientCondition> {
    const condition = await this.conditionRepository.findOne({
      where: { id: conditionId, patientId },
    });

    if (!condition) {
      throw new NotFoundException(`Condition not found`);
    }

    condition.status = ConditionStatus.ACTIVE;
    condition.resolutionDate = null;
    await this.conditionRepository.save(condition);

    this.logger.log(`Condition reactivated: ${conditionId}`);

    return condition;
  }

  /**
   * Check for critical conditions
   */
  async hasCriticalConditions(patientId: string): Promise<boolean> {
    const criticalConditions = await this.conditionRepository.find({
      where: {
        patientId,
        status: ConditionStatus.ACTIVE,
      },
    });

    // List of conditions that are considered critical
    const criticalTerms = ['cancer', 'heart', 'cardiac', 'stroke', 'diabetes', 'sepsis', 'failure'];
    
    return criticalConditions.some((condition) =>
      criticalTerms.some((term) =>
        condition.conditionName.toLowerCase().includes(term),
      ),
    );
  }
}
