import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConsultationConsentService } from './consultation-consent.service';
import {
  ConsultationConsent,
  ConsentStatus,
} from '@entities/consultation-consent.entity';
import { Consultation } from '@entities/consultation.entity';

describe('ConsultationConsentService', () => {
  let service: ConsultationConsentService;
  let mockConsentRepository: any;
  let mockConsultationRepository: any;

  beforeEach(async () => {
    mockConsentRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    mockConsultationRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationConsentService,
        { provide: getRepositoryToken(ConsultationConsent), useValue: mockConsentRepository },
        { provide: getRepositoryToken(Consultation), useValue: mockConsultationRepository },
      ],
    }).compile();

    service = module.get<ConsultationConsentService>(ConsultationConsentService);
  });

  describe('requestConsent', () => {
    it('should create a PENDING consent record for an existing consultation', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockConsentRepository.findOne.mockResolvedValue(null);
      mockConsentRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.requestConsent('consul-001', ['AUDIO_RECORDING']);

      expect(result.status).toBe(ConsentStatus.PENDING);
      expect(result.consentText).toBe('AUDIO_RECORDING');
    });

    it('should throw NotFoundException if the consultation does not exist', async () => {
      mockConsultationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.requestConsent('missing', ['AUDIO_RECORDING']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if consent was already requested', async () => {
      mockConsultationRepository.findOne.mockResolvedValue({ id: 'consul-001' });
      mockConsentRepository.findOne.mockResolvedValue({ id: 'consent-001' });

      await expect(
        service.requestConsent('consul-001', ['AUDIO_RECORDING']),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('grantConsent', () => {
    it('should move a PENDING consent to GIVEN', async () => {
      mockConsentRepository.findOne.mockResolvedValue({
        id: 'consent-001',
        status: ConsentStatus.PENDING,
      });
      mockConsentRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.grantConsent('consul-001', 'verbal confirmation');

      expect(result.status).toBe(ConsentStatus.GIVEN);
      expect(result.consentGivenAt).toBeInstanceOf(Date);
      expect(result.notes).toBe('verbal confirmation');
    });

    it('should throw NotFoundException if no consent request exists', async () => {
      mockConsentRepository.findOne.mockResolvedValue(null);

      await expect(service.grantConsent('missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if consent was already given', async () => {
      mockConsentRepository.findOne.mockResolvedValue({
        id: 'consent-001',
        status: ConsentStatus.GIVEN,
      });

      await expect(service.grantConsent('consul-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('declineConsent', () => {
    it('should move a PENDING consent to DECLINED', async () => {
      mockConsentRepository.findOne.mockResolvedValue({
        id: 'consent-001',
        status: ConsentStatus.PENDING,
      });
      mockConsentRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.declineConsent('consul-001');

      expect(result.status).toBe(ConsentStatus.DECLINED);
      expect(result.notes).toBe('Consent declined by patient');
    });

    it('should throw BadRequestException if consent was already processed', async () => {
      mockConsentRepository.findOne.mockResolvedValue({
        id: 'consent-001',
        status: ConsentStatus.GIVEN,
      });

      await expect(service.declineConsent('consul-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('withdrawConsent', () => {
    it('should move a GIVEN consent to WITHDRAWN', async () => {
      mockConsentRepository.findOne.mockResolvedValue({
        id: 'consent-001',
        status: ConsentStatus.GIVEN,
      });
      mockConsentRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.withdrawConsent('consul-001', 'changed my mind');

      expect(result.status).toBe(ConsentStatus.WITHDRAWN);
      expect(result.notes).toBe('changed my mind');
    });

    it('should throw BadRequestException if consent was never given', async () => {
      mockConsentRepository.findOne.mockResolvedValue({
        id: 'consent-001',
        status: ConsentStatus.PENDING,
      });

      await expect(service.withdrawConsent('consul-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('hasValidConsent', () => {
    it('should return true when consent status is GIVEN', async () => {
      mockConsentRepository.findOne.mockResolvedValue({ status: ConsentStatus.GIVEN });

      await expect(service.hasValidConsent('consul-001')).resolves.toBe(true);
    });

    it('should return false when no consent record exists', async () => {
      mockConsentRepository.findOne.mockResolvedValue(null);

      await expect(service.hasValidConsent('consul-001')).resolves.toBe(false);
    });

    it('should return false when consent is only PENDING', async () => {
      mockConsentRepository.findOne.mockResolvedValue({ status: ConsentStatus.PENDING });

      await expect(service.hasValidConsent('consul-001')).resolves.toBe(false);
    });
  });

  describe('verifyConsent', () => {
    it('should resolve without error when consent is valid', async () => {
      mockConsentRepository.findOne.mockResolvedValue({ status: ConsentStatus.GIVEN });

      await expect(service.verifyConsent('consul-001')).resolves.toBeUndefined();
    });

    it('should throw BadRequestException when consent is not valid', async () => {
      mockConsentRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyConsent('consul-001')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getConsentStats', () => {
    it('should aggregate counts by status', async () => {
      mockConsentRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2) // pending
        .mockResolvedValueOnce(5) // given
        .mockResolvedValueOnce(2) // declined
        .mockResolvedValueOnce(1); // withdrawn

      const stats = await service.getConsentStats();

      expect(stats).toEqual({ total: 10, pending: 2, given: 5, declined: 2, withdrawn: 1 });
    });
  });
});
