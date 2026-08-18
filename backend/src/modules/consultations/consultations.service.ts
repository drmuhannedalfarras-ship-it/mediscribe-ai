import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation, ConsultationStatus } from '@entities/consultation.entity';
import { Patient } from '@entities/patient.entity';
import { User } from '@entities/user.entity';
import { CreateConsultationDto, UpdateConsultationDto } from '@dto/index';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create a new consultation
   */
  async createConsultation(
    patientId: string,
    physicianId: string,
    createConsultationDto: CreateConsultationDto,
  ): Promise<Consultation> {
    // Validate patient exists
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    // Validate physician exists
    const physician = await this.userRepository.findOne({
      where: { id: physicianId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!physician) {
      throw new NotFoundException(`Physician not found: ${physicianId}`);
    }

    // Verify physician has PHYSICIAN role
    const hasPhysicianRole = physician.userRoles.some(
      (ur) => ur.role.name === 'PHYSICIAN' || ur.role.name === 'CLINICAL_ADMIN' || ur.role.name === 'SUPER_ADMIN',
    );

    if (!hasPhysicianRole) {
      throw new BadRequestException('User is not a physician');
    }

    // Create consultation
    const consultation = this.consultationRepository.create({
      patient,
      physician,
      department: createConsultationDto.department,
      specialty: createConsultationDto.specialty,
      reasonForVisit: createConsultationDto.reasonForVisit,
      status: ConsultationStatus.SCHEDULED,
      consultationDate: new Date(),
    });

    await this.consultationRepository.save(consultation);

    this.logger.log(
      `Consultation created: ${consultation.id} (Patient: ${patient.patientId}, Physician: ${physician.email})`,
    );

    return consultation;
  }

  /**
   * Get all consultations for a patient
   */
  async getPatientConsultations(
    patientId: string,
    skip: number = 0,
    take: number = 20,
    status?: ConsultationStatus,
  ): Promise<{
    data: Consultation[];
    total: number;
    skip: number;
    take: number;
  }> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    const query = this.consultationRepository.createQueryBuilder('consultation')
      .where('consultation.patientId = :patientId', { patientId });

    if (status) {
      query.andWhere('consultation.status = :status', { status });
    }

    const [data, total] = await query
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.physician', 'physician')
      .skip(skip)
      .take(take)
      .orderBy('consultation.consultationDate', 'DESC')
      .getManyAndCount();

    return { data, total, skip, take };
  }

  /**
   * Get all consultations for a physician
   */
  async getPhysicianConsultations(
    physicianId: string,
    skip: number = 0,
    take: number = 20,
    status?: ConsultationStatus,
  ): Promise<{
    data: Consultation[];
    total: number;
  }> {
    const query = this.consultationRepository.createQueryBuilder('consultation')
      .where('consultation.physicianId = :physicianId', { physicianId });

    if (status) {
      query.andWhere('consultation.status = :status', { status });
    }

    const [data, total] = await query
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.physician', 'physician')
      .skip(skip)
      .take(take)
      .orderBy('consultation.consultationDate', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Get consultation by ID
   */
  async getConsultationById(consultationId: string): Promise<Consultation> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
      relations: ['patient', 'physician', 'consent'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    return consultation;
  }

  /**
   * Update consultation
   */
  async updateConsultation(
    consultationId: string,
    updateConsultationDto: UpdateConsultationDto,
  ): Promise<Consultation> {
    const consultation = await this.getConsultationById(consultationId);

    // Update only provided fields
    if (updateConsultationDto.reasonForVisit) {
      consultation.reasonForVisit = updateConsultationDto.reasonForVisit;
    }
    if (updateConsultationDto.department) {
      consultation.department = updateConsultationDto.department;
    }
    if (updateConsultationDto.specialty) {
      consultation.specialty = updateConsultationDto.specialty;
    }
    if (updateConsultationDto.notes) {
      consultation.notes = updateConsultationDto.notes;
    }

    await this.consultationRepository.save(consultation);

    this.logger.log(`Consultation updated: ${consultationId}`);

    return consultation;
  }

  /**
   * Transition consultation status
   */
  async transitionStatus(
    consultationId: string,
    newStatus: ConsultationStatus,
  ): Promise<Consultation> {
    const consultation = await this.getConsultationById(consultationId);

    // Validate status transition
    this.validateStatusTransition(consultation.status, newStatus);

    consultation.status = newStatus;

    // Set timestamps for transitions
    switch (newStatus) {
      case ConsultationStatus.IN_PROGRESS:
        consultation.startedAt = new Date();
        break;
      case ConsultationStatus.PROCESSING:
        consultation.completedAt = new Date();
        break;
      case ConsultationStatus.FINALIZED:
        consultation.finalizedAt = new Date();
        break;
    }

    await this.consultationRepository.save(consultation);

    this.logger.log(
      `Consultation status changed: ${consultationId} → ${newStatus}`,
    );

    return consultation;
  }

  /**
   * Get consultations ready for physician review
   */
  async getConsultationsForReview(
    physicianId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{
    data: Consultation[];
    total: number;
  }> {
    const [data, total] = await this.consultationRepository.findAndCount({
      where: {
        physicianId,
        status: ConsultationStatus.PHYSICIAN_REVIEW,
      },
      relations: [
        'patient',
        'audioSession',
        'transcriptSegments',
        'clinicalExtractions',
        'clinicalNote',
      ],
      skip,
      take,
      order: { completedAt: 'DESC' },
    });

    return { data, total };
  }

  /**
   * Search consultations by patient or date
   */
  async searchConsultations(
    patientId?: string,
    physicianId?: string,
    startDate?: Date,
    endDate?: Date,
    skip: number = 0,
    take: number = 20,
  ): Promise<{
    data: Consultation[];
    total: number;
  }> {
    const query = this.consultationRepository.createQueryBuilder('consultation');

    if (patientId) {
      query.andWhere('consultation.patientId = :patientId', { patientId });
    }

    if (physicianId) {
      query.andWhere('consultation.physicianId = :physicianId', {
        physicianId,
      });
    }

    if (startDate && endDate) {
      query.andWhere('consultation.consultationDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere('consultation.consultationDate >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('consultation.consultationDate <= :endDate', { endDate });
    }

    const [data, total] = await query
      .leftJoinAndSelect('consultation.patient', 'patient')
      .leftJoinAndSelect('consultation.physician', 'physician')
      .skip(skip)
      .take(take)
      .orderBy('consultation.consultationDate', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Delete consultation (soft delete)
   */
  async deleteConsultation(consultationId: string): Promise<void> {
    const consultation = await this.getConsultationById(consultationId);

    await this.consultationRepository.softRemove(consultation);

    this.logger.log(`Consultation deleted: ${consultationId}`);
  }

  /**
   * Helper: Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: ConsultationStatus,
    newStatus: ConsultationStatus,
  ): void {
    // Define valid transitions
    const validTransitions: { [key in ConsultationStatus]: ConsultationStatus[] } = {
      [ConsultationStatus.SCHEDULED]: [
        ConsultationStatus.IN_PROGRESS,
        ConsultationStatus.CANCELLED,
      ],
      [ConsultationStatus.IN_PROGRESS]: [
        ConsultationStatus.PROCESSING,
        ConsultationStatus.CANCELLED,
      ],
      [ConsultationStatus.PROCESSING]: [
        ConsultationStatus.AI_REVIEW_READY,
        ConsultationStatus.PROCESSING,
      ],
      [ConsultationStatus.AI_REVIEW_READY]: [
        ConsultationStatus.PHYSICIAN_REVIEW,
      ],
      [ConsultationStatus.PHYSICIAN_REVIEW]: [
        ConsultationStatus.FINALIZED,
        ConsultationStatus.IN_PROGRESS,
      ],
      [ConsultationStatus.FINALIZED]: [
        ConsultationStatus.AMENDED,
      ],
      [ConsultationStatus.AMENDED]: [
        ConsultationStatus.FINALIZED,
      ],
      [ConsultationStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Get consultation statistics
   */
  async getConsultationStats(physicianId?: string): Promise<{
    total: number;
    scheduled: number;
    inProgress: number;
    processing: number;
    reviewReady: number;
    finalized: number;
    cancelled: number;
  }> {
    const baseQuery = this.consultationRepository.createQueryBuilder('consultation');

    if (physicianId) {
      baseQuery.where('consultation.physicianId = :physicianId', {
        physicianId,
      });
    }

    const total = await baseQuery.getCount();

    const statusCounts = await this.consultationRepository
      .createQueryBuilder('consultation')
      .select('consultation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('consultation.status')
      .getRawMany();

    const counts: {
      [key: string]: number;
    } = {
      [ConsultationStatus.SCHEDULED]: 0,
      [ConsultationStatus.IN_PROGRESS]: 0,
      [ConsultationStatus.PROCESSING]: 0,
      [ConsultationStatus.AI_REVIEW_READY]: 0,
      [ConsultationStatus.PHYSICIAN_REVIEW]: 0,
      [ConsultationStatus.FINALIZED]: 0,
      [ConsultationStatus.CANCELLED]: 0,
    };

    statusCounts.forEach((sc) => {
      counts[sc.status] = parseInt(sc.count, 10);
    });

    return {
      total,
      scheduled: counts[ConsultationStatus.SCHEDULED],
      inProgress: counts[ConsultationStatus.IN_PROGRESS],
      processing: counts[ConsultationStatus.PROCESSING],
      reviewReady: counts[ConsultationStatus.AI_REVIEW_READY],
      finalized: counts[ConsultationStatus.FINALIZED],
      cancelled: counts[ConsultationStatus.CANCELLED],
    };
  }
}
