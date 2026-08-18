import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { VitalSigns } from '@entities/vital-signs.entity';
import { Patient } from '@entities/patient.entity';
import { User } from '@entities/user.entity';
import { CreateVitalSignsDto, UpdateVitalSignsDto } from '@dto/index';

@Injectable()
export class VitalSignsService {
  private readonly logger = new Logger(VitalSignsService.name);

  // Valid ranges for vital signs
  private readonly VALID_RANGES = {
    height: { min: 30, max: 300 }, // cm
    weight: { min: 2, max: 300 }, // kg
    systolicBP: { min: 50, max: 250 }, // mmHg
    diastolicBP: { min: 30, max: 150 }, // mmHg
    pulse: { min: 20, max: 200 }, // beats/min
    temperature: { min: 30, max: 45 }, // Celsius
    respiratoryRate: { min: 5, max: 60 }, // breaths/min
    spO2: { min: 50, max: 100 }, // percentage
  };

  constructor(
    @InjectRepository(VitalSigns)
    private readonly vitalSignsRepository: Repository<VitalSigns>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Record vital signs for a patient
   */
  async recordVitalSigns(
    patientId: string,
    createVitalSignsDto: CreateVitalSignsDto,
    recordedById?: string,
  ): Promise<VitalSigns> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    // Validate ranges
    this.validateVitalSignRanges(createVitalSignsDto);

    let recordedBy: User | undefined;
    if (recordedById) {
      recordedBy = (await this.userRepository.findOne({
        where: { id: recordedById },
      })) ?? undefined;
    }

    const vitalSigns = this.vitalSignsRepository.create({
      patient,
      recordedBy,
      height: createVitalSignsDto.height,
      weight: createVitalSignsDto.weight,
      systolicBP: createVitalSignsDto.systolicBP,
      diastolicBP: createVitalSignsDto.diastolicBP,
      pulse: createVitalSignsDto.pulse,
      temperature: createVitalSignsDto.temperature,
      respiratoryRate: createVitalSignsDto.respiratoryRate,
      spO2: createVitalSignsDto.spO2,
      notes: createVitalSignsDto.notes,
      measuredAt: createVitalSignsDto.measuredAt || new Date(),
    });

    // Calculate BMI if height and weight are provided
    if (vitalSigns.height && vitalSigns.weight) {
      vitalSigns.bmi = vitalSigns.calculateBMI();
    }

    await this.vitalSignsRepository.save(vitalSigns);

    this.logger.log(`Vital signs recorded for patient ${patientId}`);

    return vitalSigns;
  }

  /**
   * Get latest vital signs for a patient
   */
  async getLatestVitalSigns(patientId: string): Promise<VitalSigns | null> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    return this.vitalSignsRepository.findOne({
      where: { patientId },
      order: { measuredAt: 'DESC' },
      relations: ['recordedBy'],
    });
  }

  /**
   * Get vital signs history for a patient
   */
  async getVitalSignsHistory(
    patientId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{
    data: VitalSigns[];
    total: number;
  }> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    const [data, total] = await this.vitalSignsRepository.findAndCount({
      where: { patientId },
      skip,
      take,
      order: { measuredAt: 'DESC' },
      relations: ['recordedBy'],
    });

    return { data, total };
  }

  /**
   * Get vital signs for a specific date range
   */
  async getVitalSignsByDateRange(
    patientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<VitalSigns[]> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    return this.vitalSignsRepository.find({
      where: {
        patientId,
        measuredAt: Between(startDate, endDate),
      },
      order: { measuredAt: 'ASC' },
    });
  }

  /**
   * Update vital signs record
   */
  async updateVitalSigns(
    patientId: string,
    vitalSignsId: string,
    updateDto: UpdateVitalSignsDto,
  ): Promise<VitalSigns> {
    const vitalSigns = await this.vitalSignsRepository.findOne({
      where: { id: vitalSignsId, patientId },
    });

    if (!vitalSigns) {
      throw new NotFoundException(`Vital signs record not found`);
    }

    // Update only provided fields
    if (updateDto.height !== undefined) {
      vitalSigns.height = updateDto.height;
    }
    if (updateDto.weight !== undefined) {
      vitalSigns.weight = updateDto.weight;
    }
    if (updateDto.systolicBP !== undefined) {
      vitalSigns.systolicBP = updateDto.systolicBP;
    }
    if (updateDto.diastolicBP !== undefined) {
      vitalSigns.diastolicBP = updateDto.diastolicBP;
    }
    if (updateDto.pulse !== undefined) {
      vitalSigns.pulse = updateDto.pulse;
    }
    if (updateDto.temperature !== undefined) {
      vitalSigns.temperature = updateDto.temperature;
    }
    if (updateDto.respiratoryRate !== undefined) {
      vitalSigns.respiratoryRate = updateDto.respiratoryRate;
    }
    if (updateDto.spO2 !== undefined) {
      vitalSigns.spO2 = updateDto.spO2;
    }
    if (updateDto.notes !== undefined) {
      vitalSigns.notes = updateDto.notes;
    }

    // Recalculate BMI if height or weight changed
    if (vitalSigns.height && vitalSigns.weight) {
      vitalSigns.bmi = vitalSigns.calculateBMI();
    }

    // Validate ranges
    this.validateVitalSignRanges(vitalSigns);

    await this.vitalSignsRepository.save(vitalSigns);

    this.logger.log(`Vital signs updated: ${vitalSignsId}`);

    return vitalSigns;
  }

  /**
   * Check if vital signs are abnormal
   */
  checkForAbnormalities(vitalSigns: VitalSigns): string[] {
    const abnormalities: string[] = [];

    // Temperature abnormalities
    if (vitalSigns.temperature) {
      if (vitalSigns.temperature < 36.5) {
        abnormalities.push('Hypothermia (low temperature)');
      } else if (vitalSigns.temperature > 38.5) {
        abnormalities.push('Fever (high temperature)');
      }
    }

    // Blood pressure abnormalities
    if (vitalSigns.systolicBP && vitalSigns.diastolicBP) {
      if (vitalSigns.systolicBP > 180 || vitalSigns.diastolicBP > 120) {
        abnormalities.push('Hypertensive crisis');
      } else if (vitalSigns.systolicBP < 90 || vitalSigns.diastolicBP < 60) {
        abnormalities.push('Hypotension (low blood pressure)');
      }
    }

    // Pulse abnormalities
    if (vitalSigns.pulse) {
      if (vitalSigns.pulse < 60) {
        abnormalities.push('Bradycardia (low heart rate)');
      } else if (vitalSigns.pulse > 100) {
        abnormalities.push('Tachycardia (high heart rate)');
      }
    }

    // Oxygen saturation abnormalities
    if (vitalSigns.spO2) {
      if (vitalSigns.spO2 < 92) {
        abnormalities.push('Low oxygen saturation');
      }
    }

    // Respiratory rate abnormalities
    if (vitalSigns.respiratoryRate) {
      if (vitalSigns.respiratoryRate < 12) {
        abnormalities.push('Bradypnea (low respiratory rate)');
      } else if (vitalSigns.respiratoryRate > 20) {
        abnormalities.push('Tachypnea (high respiratory rate)');
      }
    }

    return abnormalities;
  }

  /**
   * Helper: Validate vital signs are within acceptable ranges
   */
  private validateVitalSignRanges(vitalSigns: any): void {
    if (vitalSigns.height !== undefined) {
      const { min, max } = this.VALID_RANGES.height;
      if (vitalSigns.height < min || vitalSigns.height > max) {
        throw new BadRequestException(
          `Height must be between ${min} and ${max} cm`,
        );
      }
    }

    if (vitalSigns.weight !== undefined) {
      const { min, max } = this.VALID_RANGES.weight;
      if (vitalSigns.weight < min || vitalSigns.weight > max) {
        throw new BadRequestException(
          `Weight must be between ${min} and ${max} kg`,
        );
      }
    }

    if (vitalSigns.systolicBP !== undefined) {
      const { min, max } = this.VALID_RANGES.systolicBP;
      if (vitalSigns.systolicBP < min || vitalSigns.systolicBP > max) {
        throw new BadRequestException(
          `Systolic BP must be between ${min} and ${max} mmHg`,
        );
      }
    }

    if (vitalSigns.diastolicBP !== undefined) {
      const { min, max } = this.VALID_RANGES.diastolicBP;
      if (vitalSigns.diastolicBP < min || vitalSigns.diastolicBP > max) {
        throw new BadRequestException(
          `Diastolic BP must be between ${min} and ${max} mmHg`,
        );
      }
    }

    if (vitalSigns.pulse !== undefined) {
      const { min, max } = this.VALID_RANGES.pulse;
      if (vitalSigns.pulse < min || vitalSigns.pulse > max) {
        throw new BadRequestException(
          `Pulse must be between ${min} and ${max} beats/min`,
        );
      }
    }

    if (vitalSigns.temperature !== undefined) {
      const { min, max } = this.VALID_RANGES.temperature;
      if (vitalSigns.temperature < min || vitalSigns.temperature > max) {
        throw new BadRequestException(
          `Temperature must be between ${min} and ${max}°C`,
        );
      }
    }

    if (vitalSigns.respiratoryRate !== undefined) {
      const { min, max } = this.VALID_RANGES.respiratoryRate;
      if (vitalSigns.respiratoryRate < min || vitalSigns.respiratoryRate > max) {
        throw new BadRequestException(
          `Respiratory rate must be between ${min} and ${max} breaths/min`,
        );
      }
    }

    if (vitalSigns.spO2 !== undefined) {
      const { min, max } = this.VALID_RANGES.spO2;
      if (vitalSigns.spO2 < min || vitalSigns.spO2 > max) {
        throw new BadRequestException(
          `SpO2 must be between ${min} and ${max} %`,
        );
      }
    }
  }
}
