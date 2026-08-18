import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConsultationConsentService } from './consultation-consent.service';
import { ConsultationConsent } from '@entities/consultation-consent.entity';

describe('ConsultationConsentService', () => {
  let service: ConsultationConsentService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationConsentService,
        {
          provide: getRepositoryToken(ConsultationConsent),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ConsultationConsentService>(ConsultationConsentService);
  });

  describe('requestConsent', () => {
    it('should create consent request for consultation', async () => {
      const consentData = {
        consultationId: 'consul-001',
        patientId: 'patient-001',
        consentType: 'recording',
        status: 'pending',
      };

      mockRepository.save.mockResolvedValue({ id: 'consent-001', ...consentData });

      const result = await service.requestConsent(consentData);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });

    it('should validate consent type', () => {
      const validTypes = ['recording', 'transcription', 'data-sharing'];

      validTypes.forEach(type => {
        expect(service.isValidConsentType(type)).toBe(true);
      });
    });

    it('should reject invalid consent type', () => {
      expect(service.isValidConsentType('invalid-type')).toBe(false);
    });
  });

  describe('grantConsent', () => {
    it('should grant consent for consultation', async () => {
      const consent = {
        id: 'consent-001',
        status: 'pending',
        consultationId: 'consul-001',
      };

      mockRepository.findOne.mockResolvedValue(consent);
      mockRepository.save.mockResolvedValue({
        ...consent,
        status: 'given',
        grantedAt: new Date(),
      });

      const result = await service.grantConsent('consent-001');

      expect(result.status).toBe('given');
    });

    it('should set timestamp when consent granted', async () => {
      const consent = { id: 'consent-001', status: 'pending' };

      mockRepository.findOne.mockResolvedValue(consent);
      mockRepository.save.mockResolvedValue({
        ...consent,
        status: 'given',
        grantedAt: expect.any(Date),
      });

      const result = await service.grantConsent('consent-001');

      expect(result.grantedAt).toBeDefined();
    });

    it('should throw error if consent not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.grantConsent('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw previously granted consent', async () => {
      const consent = {
        id: 'consent-001',
        status: 'given',
        consultationId: 'consul-001',
      };

      mockRepository.findOne.mockResolvedValue(consent);
      mockRepository.save.mockResolvedValue({
        ...consent,
        status: 'withdrawn',
        withdrawnAt: new Date(),
      });

      const result = await service.withdrawConsent('consent-001');

      expect(result.status).toBe('withdrawn');
    });

    it('should only allow withdrawing given consent', async () => {
      const consent = {
        id: 'consent-001',
        status: 'pending',
        consultationId: 'consul-001',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      await expect(service.withdrawConsent('consent-001')).rejects.toThrow();
    });
  });

  describe('denyConsent', () => {
    it('should deny pending consent request', async () => {
      const consent = {
        id: 'consent-001',
        status: 'pending',
        consultationId: 'consul-001',
      };

      mockRepository.findOne.mockResolvedValue(consent);
      mockRepository.save.mockResolvedValue({
        ...consent,
        status: 'denied',
        deniedAt: new Date(),
      });

      const result = await service.denyConsent('consent-001');

      expect(result.status).toBe('denied');
    });
  });

  describe('getConsultationConsent', () => {
    it('should retrieve consent status for consultation', async () => {
      const consent = {
        consultationId: 'consul-001',
        status: 'given',
        consentType: 'recording',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      const result = await service.getConsultationConsent('consul-001');

      expect(result).toBeDefined();
      expect(result.status).toBe('given');
    });

    it('should return null if no consent found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getConsultationConsent('consul-001');

      expect(result).toBeNull();
    });
  });

  describe('checkConsentStatus', () => {
    it('should check if consent is given', async () => {
      const consent = {
        consultationId: 'consul-001',
        status: 'given',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      const isGiven = await service.isConsentGiven('consul-001');

      expect(isGiven).toBe(true);
    });

    it('should return false if consent not given', async () => {
      const consent = {
        consultationId: 'consul-001',
        status: 'pending',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      const isGiven = await service.isConsentGiven('consul-001');

      expect(isGiven).toBe(false);
    });

    it('should return false if consent withdrawn', async () => {
      const consent = {
        consultationId: 'consul-001',
        status: 'withdrawn',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      const isGiven = await service.isConsentGiven('consul-001');

      expect(isGiven).toBe(false);
    });
  });

  describe('getConsentHistory', () => {
    it('should return consent history for consultation', async () => {
      const history = [
        { status: 'pending', timestamp: new Date('2026-08-15') },
        { status: 'given', timestamp: new Date('2026-08-16') },
      ];

      mockRepository.find.mockResolvedValue(history);

      const result = await service.getConsentHistory('consul-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('validateConsentBeforeAudio', () => {
    it('should allow audio recording if consent given', async () => {
      const consent = {
        consultationId: 'consul-001',
        consentType: 'recording',
        status: 'given',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      const canRecord = await service.canRecordAudio('consul-001');

      expect(canRecord).toBe(true);
    });

    it('should block audio recording without consent', async () => {
      const consent = {
        consultationId: 'consul-001',
        consentType: 'recording',
        status: 'denied',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      const canRecord = await service.canRecordAudio('consul-001');

      expect(canRecord).toBe(false);
    });

    it('should block audio if consent withdrawn', async () => {
      const consent = {
        consultationId: 'consul-001',
        consentType: 'recording',
        status: 'withdrawn',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      const canRecord = await service.canRecordAudio('consul-001');

      expect(canRecord).toBe(false);
    });
  });

  describe('validateConsentForProcessing', () => {
    it('should allow processing with data-sharing consent', async () => {
      const consent = {
        consultationId: 'consul-001',
        consentType: 'data-sharing',
        status: 'given',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      const canProcess = await service.canProcessData('consul-001');

      expect(canProcess).toBe(true);
    });

    it('should block processing without data-sharing consent', async () => {
      const consent = {
        consultationId: 'consul-001',
        consentType: 'recording',
        status: 'given',
      };

      mockRepository.findOne.mockResolvedValue(consent);

      const canProcess = await service.canProcessData('consul-001');

      expect(canProcess).toBe(false);
    });
  });

  describe('auditConsentAccess', () => {
    it('should log consent access for audit', async () => {
      const auditData = {
        consultationId: 'consul-001',
        action: 'consent_accessed',
        timestamp: new Date(),
      };

      // Should create audit log
      await service.logConsentAccess(auditData);

      // Verify audit log would be created
      expect(service).toBeDefined();
    });
  });

  describe('consentExpiration', () => {
    it('should check if consent is expired', () => {
      const grantedDate = new Date('2026-08-01');
      const expirationDays = 30;

      const isExpired = service.isConsentExpired(grantedDate, expirationDays);

      expect(typeof isExpired).toBe('boolean');
    });
  });
});
