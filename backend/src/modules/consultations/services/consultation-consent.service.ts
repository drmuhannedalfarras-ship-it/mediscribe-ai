import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConsultationConsent,
  ConsentStatus,
} from '@entities/consultation-consent.entity';
import { Consultation } from '@entities/consultation.entity';

@Injectable()
export class ConsultationConsentService {
  private readonly logger = new Logger(ConsultationConsentService.name);

  constructor(
    @InjectRepository(ConsultationConsent)
    private readonly consentRepository: Repository<ConsultationConsent>,
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
  ) {}

  /**
   * Create consent request for consultation
   */
  async requestConsent(
    consultationId: string,
    consentTypes: string[],
  ): Promise<ConsultationConsent> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Check if consent already exists
    const existingConsent = await this.consentRepository.findOne({
      where: { consultationId },
    });

    if (existingConsent) {
      throw new BadRequestException('Consent already requested for this consultation');
    }

    const consent = this.consentRepository.create({
      consultation,
      consentText: consentTypes.join(', '),
      consentVersion: '1.0',
      status: ConsentStatus.PENDING,
    });

    await this.consentRepository.save(consent);

    this.logger.log(`Consent requested: ${consultationId}`);

    return consent;
  }

  /**
   * Get consent for consultation
   */
  async getConsent(consultationId: string): Promise<ConsultationConsent | null> {
    return this.consentRepository.findOne({
      where: { consultationId },
      relations: ['consultation', 'consultation.patient'],
    });
  }

  /**
   * Grant consent
   */
  async grantConsent(
    consultationId: string,
    consentDetails?: string,
  ): Promise<ConsultationConsent> {
    const consent = await this.getConsent(consultationId);

    if (!consent) {
      throw new NotFoundException('Consent request not found');
    }

    if (consent.status !== ConsentStatus.PENDING) {
      throw new BadRequestException('Consent has already been processed');
    }

    consent.status = ConsentStatus.GIVEN;
    consent.consentGivenAt = new Date();
    consent.notes = consentDetails;

    await this.consentRepository.save(consent);

    this.logger.log(`Consent granted: ${consultationId}`);

    return consent;
  }

  /**
   * Decline consent
   */
  async declineConsent(
    consultationId: string,
    reason?: string,
  ): Promise<ConsultationConsent> {
    const consent = await this.getConsent(consultationId);

    if (!consent) {
      throw new NotFoundException('Consent request not found');
    }

    if (consent.status !== ConsentStatus.PENDING) {
      throw new BadRequestException('Consent has already been processed');
    }

    consent.status = ConsentStatus.DECLINED;
    consent.consentDeclinedAt = new Date();
    consent.notes = reason || 'Consent declined by patient';

    await this.consentRepository.save(consent);

    this.logger.log(`Consent declined: ${consultationId}`);

    return consent;
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    consultationId: string,
    reason?: string,
  ): Promise<ConsultationConsent> {
    const consent = await this.getConsent(consultationId);

    if (!consent) {
      throw new NotFoundException('Consent request not found');
    }

    if (consent.status !== ConsentStatus.GIVEN) {
      throw new BadRequestException('Cannot withdraw consent that was not given');
    }

    consent.status = ConsentStatus.WITHDRAWN;
    consent.consentWithdrawnAt = new Date();
    consent.notes = reason || 'Consent withdrawn by patient';

    await this.consentRepository.save(consent);

    this.logger.log(`Consent withdrawn: ${consultationId}`);

    return consent;
  }

  /**
   * Check if consultation has valid consent
   */
  async hasValidConsent(consultationId: string): Promise<boolean> {
    const consent = await this.getConsent(consultationId);

    if (!consent) {
      return false;
    }

    return consent.status === ConsentStatus.GIVEN;
  }

  /**
   * Verify consent before proceeding
   */
  async verifyConsent(consultationId: string): Promise<void> {
    const hasConsent = await this.hasValidConsent(consultationId);

    if (!hasConsent) {
      throw new BadRequestException(
        'Consultation cannot proceed without patient consent',
      );
    }
  }

  /**
   * Get consent statistics
   */
  async getConsentStats(): Promise<{
    total: number;
    pending: number;
    given: number;
    declined: number;
    withdrawn: number;
  }> {
    const total = await this.consentRepository.count();

    const pending = await this.consentRepository.count({
      where: { status: ConsentStatus.PENDING },
    });

    const given = await this.consentRepository.count({
      where: { status: ConsentStatus.GIVEN },
    });

    const declined = await this.consentRepository.count({
      where: { status: ConsentStatus.DECLINED },
    });

    const withdrawn = await this.consentRepository.count({
      where: { status: ConsentStatus.WITHDRAWN },
    });

    return { total, pending, given, declined, withdrawn };
  }
}
