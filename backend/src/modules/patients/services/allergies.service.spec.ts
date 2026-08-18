import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AllergiesService } from './allergies.service';
import { PatientAllergy } from '@entities/patient-allergy.entity';
import { MockDataFactory } from '@common/test/test.utils';

describe('AllergiesService', () => {
  let service: AllergiesService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getCount: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllergiesService,
        {
          provide: getRepositoryToken(PatientAllergy),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AllergiesService>(AllergiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addAllergy', () => {
    it('should add new allergy to patient', async () => {
      const allergyData = {
        patientId: 'patient-001',
        allergen: 'Penicillin',
        reaction: 'Rash',
        severity: 'moderate',
      };

      mockRepository.save.mockResolvedValue({ id: 'allergy-001', ...allergyData });

      const result = await service.addAllergy(allergyData);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.allergen).toBe('Penicillin');
    });

    it('should validate allergy severity', async () => {
      const invalidAllergy = {
        patientId: 'patient-001',
        allergen: 'Penicillin',
        reaction: 'Rash',
        severity: 'invalid-severity',
      };

      mockRepository.save.mockRejectedValue(new Error('Invalid severity'));

      await expect(service.addAllergy(invalidAllergy)).rejects.toThrow();
    });

    it('should prevent duplicate allergies', async () => {
      const allergyData = {
        patientId: 'patient-001',
        allergen: 'Penicillin',
        reaction: 'Rash',
        severity: 'moderate',
      };

      mockRepository.find.mockResolvedValue([allergyData]);

      const isDuplicate = await service.checkDuplicate('patient-001', 'Penicillin');

      expect(isDuplicate).toBe(true);
    });
  });

  describe('getPatientAllergies', () => {
    it('should return all allergies for patient', async () => {
      const allergies = [
        {
          id: 'allergy-001',
          patientId: 'patient-001',
          allergen: 'Penicillin',
          severity: 'moderate',
        },
        {
          id: 'allergy-002',
          patientId: 'patient-001',
          allergen: 'Aspirin',
          severity: 'mild',
        },
      ];

      mockRepository.find.mockResolvedValue(allergies);

      const result = await service.getPatientAllergies('patient-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should return empty array if no allergies', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getPatientAllergies('patient-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('removeAllergy', () => {
    it('should remove allergy by id', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'allergy-001' });
      mockRepository.remove.mockResolvedValue({ id: 'allergy-001' });

      await service.removeAllergy('allergy-001');

      expect(mockRepository.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException if allergy not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.removeAllergy('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verifySafetyForMedication', () => {
    it('should return safe if no allergies conflict', async () => {
      const allergies = [
        { allergen: 'Penicillin', severity: 'moderate' },
      ];
      const medication = 'Aspirin';

      mockRepository.find.mockResolvedValue(allergies);

      const isSafe = await service.verifySafetyForMedication('patient-001', medication);

      expect(isSafe).toBe(true);
    });

    it('should flag as unsafe if critical allergy exists', async () => {
      const allergies = [
        { allergen: 'Aspirin', severity: 'severe' },
      ];
      const medication = 'Aspirin';

      mockRepository.find.mockResolvedValue(allergies);

      const isSafe = await service.verifySafetyForMedication('patient-001', medication);

      expect(isSafe).toBe(false);
    });

    it('should warn if moderate allergy exists', async () => {
      const allergies = [
        { allergen: 'Ibuprofen', severity: 'moderate' },
      ];
      const medication = 'Ibuprofen';

      mockRepository.find.mockResolvedValue(allergies);

      const result = await service.checkAllergySafety('patient-001', medication);

      expect(result.safe).toBe(false);
      expect(result.warning).toBeDefined();
    });
  });

  describe('getAllergySeverity', () => {
    it('should return highest severity allergy', async () => {
      const allergies = [
        { allergen: 'Penicillin', severity: 'mild' },
        { allergen: 'Aspirin', severity: 'severe' },
        { allergen: 'Ibuprofen', severity: 'moderate' },
      ];

      mockRepository.find.mockResolvedValue(allergies);

      const result = await service.getHighestSeverity('patient-001');

      expect(result).toBe('severe');
    });
  });

  describe('updateAllergySeverity', () => {
    it('should update allergy severity', async () => {
      const allergy = {
        id: 'allergy-001',
        allergen: 'Penicillin',
        severity: 'mild',
      };

      mockRepository.findOne.mockResolvedValue(allergy);
      mockRepository.save.mockResolvedValue({
        ...allergy,
        severity: 'severe',
      });

      const result = await service.updateSeverity('allergy-001', 'severe');

      expect(result.severity).toBe('severe');
    });
  });

  describe('searchAllergies', () => {
    it('should search allergies by allergen name', async () => {
      const allergies = [
        { id: 'allergy-001', allergen: 'Penicillin', patientId: 'patient-001' },
      ];

      mockRepository.find.mockResolvedValue(allergies);

      const result = await service.searchByAllergen('Penicillin');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].allergen).toBe('Penicillin');
    });

    it('should filter by severity', async () => {
      const severeAllergies = [
        { id: 'allergy-001', allergen: 'Penicillin', severity: 'severe' },
      ];

      mockRepository.find.mockResolvedValue(severeAllergies);

      const result = await service.getAllergiesBySeverity('patient-001', 'severe');

      expect(result.every(a => a.severity === 'severe')).toBe(true);
    });
  });

  describe('bulkUpdateAllergies', () => {
    it('should update multiple allergies', async () => {
      const updates = [
        { id: 'allergy-001', severity: 'moderate' },
        { id: 'allergy-002', severity: 'mild' },
      ];

      mockRepository.save.mockResolvedValue(updates);

      const result = await service.bulkUpdate(updates);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.any(Array));
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('validateAllergySeverity', () => {
    it('should validate allowed severity levels', () => {
      const validSeverities = ['mild', 'moderate', 'severe'];

      validSeverities.forEach(severity => {
        const isValid = service.isValidSeverity(severity);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid severity levels', () => {
      const invalidSeverity = 'critical';
      const isValid = service.isValidSeverity(invalidSeverity);
      expect(isValid).toBe(false);
    });
  });
});
