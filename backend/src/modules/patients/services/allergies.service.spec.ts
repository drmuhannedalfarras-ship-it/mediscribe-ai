import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AllergiesService } from './allergies.service';
import { PatientAllergy, AllergySeverity } from '@entities/index';
import { Patient } from '@entities/patient.entity';

describe('AllergiesService', () => {
  let service: AllergiesService;
  let mockAllergyRepository: any;
  let mockPatientRepository: any;

  beforeEach(async () => {
    mockAllergyRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    mockPatientRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllergiesService,
        { provide: getRepositoryToken(PatientAllergy), useValue: mockAllergyRepository },
        { provide: getRepositoryToken(Patient), useValue: mockPatientRepository },
      ],
    }).compile();

    service = module.get<AllergiesService>(AllergiesService);
  });

  describe('addAllergy', () => {
    it('should create an active allergy for an existing patient', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      mockAllergyRepository.save.mockImplementation((a: any) => Promise.resolve(a));

      const result = await service.addAllergy(
        'patient-001',
        '  Penicillin  ',
        AllergySeverity.SEVERE,
        'rash',
      );

      expect(result.allergen).toBe('Penicillin');
      expect(result.severity).toBe(AllergySeverity.SEVERE);
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException if allergen or severity is missing', async () => {
      await expect(
        service.addAllergy('patient-001', '', undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if the patient does not exist', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addAllergy('missing', 'Penicillin', AllergySeverity.MILD),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPatientAllergies', () => {
    it('should return only active allergies', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      const allergies = [{ id: 'a1', isActive: true }];
      mockAllergyRepository.find.mockResolvedValue(allergies);

      const result = await service.getPatientAllergies('patient-001');

      expect(result).toBe(allergies);
      expect(mockAllergyRepository.find).toHaveBeenCalledWith({
        where: { patientId: 'patient-001', isActive: true },
        order: { severity: 'DESC' },
      });
    });

    it('should throw NotFoundException if the patient does not exist', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(service.getPatientAllergies('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAllergy', () => {
    it('should update only the provided fields', async () => {
      const allergy = {
        id: 'a1',
        allergen: 'Old',
        severity: AllergySeverity.MILD,
        reaction: 'none',
      };
      mockAllergyRepository.findOne.mockResolvedValue(allergy);
      mockAllergyRepository.save.mockImplementation((a: any) => Promise.resolve(a));

      const result = await service.updateAllergy(
        'a1',
        'patient-001',
        'New allergen',
        AllergySeverity.CRITICAL,
      );

      expect(result.allergen).toBe('New allergen');
      expect(result.severity).toBe(AllergySeverity.CRITICAL);
    });

    it('should throw NotFoundException if the allergy does not exist', async () => {
      mockAllergyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateAllergy('missing', 'patient-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAllergy', () => {
    it('should mark the allergy inactive', async () => {
      const allergy = { id: 'a1', isActive: true };
      mockAllergyRepository.findOne.mockResolvedValue(allergy);
      mockAllergyRepository.save.mockImplementation((a: any) => Promise.resolve(a));

      await service.removeAllergy('a1', 'patient-001');

      expect(allergy.isActive).toBe(false);
      expect(mockAllergyRepository.save).toHaveBeenCalledWith(allergy);
    });

    it('should throw NotFoundException if the allergy does not exist', async () => {
      mockAllergyRepository.findOne.mockResolvedValue(null);

      await expect(service.removeAllergy('missing', 'patient-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasCriticalAllergies', () => {
    it('should return true when an active CRITICAL allergy exists', async () => {
      mockAllergyRepository.count.mockResolvedValue(1);

      const result = await service.hasCriticalAllergies('patient-001');

      expect(result).toBe(true);
      expect(mockAllergyRepository.count).toHaveBeenCalledWith({
        where: {
          patientId: 'patient-001',
          isActive: true,
          severity: AllergySeverity.CRITICAL,
        },
      });
    });

    it('should return false when there are no critical allergies', async () => {
      mockAllergyRepository.count.mockResolvedValue(0);

      const result = await service.hasCriticalAllergies('patient-001');

      expect(result).toBe(false);
    });
  });
});
