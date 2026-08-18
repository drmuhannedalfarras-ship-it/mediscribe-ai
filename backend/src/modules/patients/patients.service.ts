import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient, PatientStatus } from '@entities/patient.entity';
import { CreatePatientDto, UpdatePatientDto, SearchPatientDto } from '@dto/index';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  /**
   * Create a new patient
   */
  async createPatient(createPatientDto: CreatePatientDto): Promise<Patient> {
    // Validate required fields
    if (!createPatientDto.firstName || !createPatientDto.lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    if (!createPatientDto.gender) {
      throw new BadRequestException('Gender is required');
    }

    if (!createPatientDto.dateOfBirth) {
      throw new BadRequestException('Date of birth is required');
    }

    // Validate age is reasonable
    const age = this.calculateAge(createPatientDto.dateOfBirth);
    if (age < 0 || age > 150) {
      throw new BadRequestException('Invalid date of birth');
    }

    // Generate unique MRN (Medical Record Number)
    const mrn = this.generateMRN();
    const patientId = `P-${mrn}`;

    // Create patient
    const patient = this.patientRepository.create({
      patientId,
      mrn,
      firstName: createPatientDto.firstName.trim(),
      lastName: createPatientDto.lastName.trim(),
      dateOfBirth: new Date(createPatientDto.dateOfBirth),
      gender: createPatientDto.gender,
      nationality: createPatientDto.nationality,
      email: createPatientDto.email?.toLowerCase(),
      phoneNumber: createPatientDto.phoneNumber,
      address: createPatientDto.address,
      city: createPatientDto.city,
      state: createPatientDto.state,
      postalCode: createPatientDto.postalCode,
      country: createPatientDto.country,
      emergencyContact: createPatientDto.emergencyContact,
      emergencyContactPhone: createPatientDto.emergencyContactPhone,
      bloodType: createPatientDto.bloodType,
      familyHistory: createPatientDto.familyHistory,
      socialHistory: createPatientDto.socialHistory,
      smokingStatus: createPatientDto.smokingStatus,
      status: PatientStatus.ACTIVE,
    });

    await this.patientRepository.save(patient);

    this.logger.log(`Patient created: ${patient.patientId} (${patient.fullName})`);

    return patient;
  }

  /**
   * Get all patients with pagination
   */
  async getAllPatients(
    skip: number = 0,
    take: number = 20,
    status?: PatientStatus,
  ): Promise<{
    data: Patient[];
    total: number;
    skip: number;
    take: number;
  }> {
    const query = this.patientRepository.createQueryBuilder('patient');

    if (status) {
      query.where('patient.status = :status', { status });
    }

    const [data, total] = await query
      .leftJoinAndSelect('patient.allergies', 'allergies')
      .leftJoinAndSelect('patient.medications', 'medications')
      .leftJoinAndSelect('patient.conditions', 'conditions')
      .skip(skip)
      .take(take)
      .orderBy('patient.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total, skip, take };
  }

  /**
   * Get patient by ID
   */
  async getPatientById(patientId: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
      relations: [
        'allergies',
        'medications',
        'conditions',
        'vitalSigns',
      ],
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    return patient;
  }

  /**
   * Get patient by MRN (Medical Record Number)
   */
  async getPatientByMRN(mrn: string): Promise<Patient | null> {
    return this.patientRepository.findOne({
      where: { mrn },
      relations: [
        'allergies',
        'medications',
        'conditions',
        'vitalSigns',
      ],
    });
  }

  /**
   * Get patient by PatientId (P-xxxxx)
   */
  async getPatientByPatientId(patientId: string): Promise<Patient | null> {
    return this.patientRepository.findOne({
      where: { patientId },
      relations: [
        'allergies',
        'medications',
        'conditions',
        'vitalSigns',
      ],
    });
  }

  /**
   * Update patient information
   */
  async updatePatient(
    patientId: string,
    updatePatientDto: UpdatePatientDto,
  ): Promise<Patient> {
    const patient = await this.getPatientById(patientId);

    // Update only provided fields
    if (updatePatientDto.firstName) {
      patient.firstName = updatePatientDto.firstName.trim();
    }
    if (updatePatientDto.lastName) {
      patient.lastName = updatePatientDto.lastName.trim();
    }
    if (updatePatientDto.email) {
      patient.email = updatePatientDto.email.toLowerCase();
    }
    if (updatePatientDto.phoneNumber) {
      patient.phoneNumber = updatePatientDto.phoneNumber;
    }
    if (updatePatientDto.address) {
      patient.address = updatePatientDto.address;
    }
    if (updatePatientDto.city) {
      patient.city = updatePatientDto.city;
    }
    if (updatePatientDto.state) {
      patient.state = updatePatientDto.state;
    }
    if (updatePatientDto.postalCode) {
      patient.postalCode = updatePatientDto.postalCode;
    }
    if (updatePatientDto.country) {
      patient.country = updatePatientDto.country;
    }
    if (updatePatientDto.emergencyContact) {
      patient.emergencyContact = updatePatientDto.emergencyContact;
    }
    if (updatePatientDto.emergencyContactPhone) {
      patient.emergencyContactPhone = updatePatientDto.emergencyContactPhone;
    }
    if (updatePatientDto.bloodType) {
      patient.bloodType = updatePatientDto.bloodType;
    }
    if (updatePatientDto.familyHistory !== undefined) {
      patient.familyHistory = updatePatientDto.familyHistory;
    }
    if (updatePatientDto.socialHistory !== undefined) {
      patient.socialHistory = updatePatientDto.socialHistory;
    }
    if (updatePatientDto.smokingStatus !== undefined) {
      patient.smokingStatus = updatePatientDto.smokingStatus;
    }
    if (updatePatientDto.status) {
      patient.status = updatePatientDto.status;
    }

    await this.patientRepository.save(patient);

    this.logger.log(`Patient updated: ${patient.patientId}`);

    return patient;
  }

  /**
   * Search patients
   */
  async searchPatients(
    searchDto: SearchPatientDto,
  ): Promise<{
    data: Patient[];
    total: number;
  }> {
    const { mrn, firstName, lastName, email, phoneNumber, skip = 0, take = 20 } =
      searchDto;

    const query = this.patientRepository.createQueryBuilder('patient');

    if (mrn) {
      query.andWhere('patient.mrn ILIKE :mrn', { mrn: `%${mrn}%` });
    }

    if (firstName) {
      query.andWhere('patient.firstName ILIKE :firstName', {
        firstName: `%${firstName}%`,
      });
    }

    if (lastName) {
      query.andWhere('patient.lastName ILIKE :lastName', {
        lastName: `%${lastName}%`,
      });
    }

    if (email) {
      query.andWhere('patient.email ILIKE :email', { email: `%${email}%` });
    }

    if (phoneNumber) {
      query.andWhere('patient.phoneNumber ILIKE :phoneNumber', {
        phoneNumber: `%${phoneNumber}%`,
      });
    }

    const [data, total] = await query
      .leftJoinAndSelect('patient.allergies', 'allergies')
      .leftJoinAndSelect('patient.medications', 'medications')
      .leftJoinAndSelect('patient.conditions', 'conditions')
      .skip(skip)
      .take(take)
      .orderBy('patient.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Delete patient (soft delete)
   */
  async deletePatient(patientId: string): Promise<void> {
    const patient = await this.getPatientById(patientId);

    await this.patientRepository.softRemove(patient);

    this.logger.log(`Patient deleted: ${patient.patientId}`);
  }

  /**
   * Get patient's vital signs history
   */
  async getPatientVitalSigns(
    patientId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{
    data: any[];
    total: number;
  }> {
    const patient = await this.getPatientById(patientId);

    // Vital signs are loaded with relations
    const vitalSigns = patient.vitalSigns || [];
    const sorted = vitalSigns.sort(
      (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
    );

    const paginated = sorted.slice(skip, skip + take);

    return {
      data: paginated,
      total: vitalSigns.length,
    };
  }

  /**
   * Get active patients
   */
  async getActivePatients(
    skip: number = 0,
    take: number = 20,
  ): Promise<{
    data: Patient[];
    total: number;
  }> {
    const [data, total] = await this.patientRepository.findAndCount({
      where: { status: PatientStatus.ACTIVE },
      skip,
      take,
      order: { createdAt: 'DESC' },
      relations: ['allergies', 'medications', 'conditions'],
    });

    return { data, total };
  }

  /**
   * Helper: Generate unique MRN
   * Format: YYYYMMDDxxxx where x are random digits
   */
  private generateMRN(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    return `${year}${month}${day}${random}`;
  }

  /**
   * Helper: Calculate age from birth date
   */
  private calculateAge(birthDate: Date | string): number {
    const birth = new Date(birthDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }
}
