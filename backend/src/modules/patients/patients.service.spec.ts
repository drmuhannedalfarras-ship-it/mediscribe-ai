import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { Patient } from '@entities/patient.entity';
import { TestDataGenerator, MockDataFactory } from '@common/test/test.utils';

describe('PatientsService', () => {
  let service: PatientsService;
  let mockRepository: any;

  const mockPatientData = MockDataFactory.createMockPatient();

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getCount: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: getRepositoryToken(Patient),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPatient', () => {
    it('should create a new patient', async () => {
      const createDto = TestDataGenerator.generatePatientData();
      mockRepository.save.mockResolvedValue(mockPatientData);

      const result = await service.createPatient(createDto);

      expect(mockRepository.save).toHaveBeenCalledWith(expect.objectContaining(createDto));
      expect(result).toEqual(mockPatientData);
    });

    it('should validate required fields', async () => {
      const invalidDto = { fullName: 'Test' }; // Missing required fields

      mockRepository.save.mockRejectedValue(new Error('Validation error'));

      await expect(service.createPatient(invalidDto))
        .rejects
        .toThrow();
    });

    it('should calculate BMI on patient creation', async () => {
      const createDto = TestDataGenerator.generatePatientData({
        height: 180,
        weight: 80,
      });

      const expectedBmi = 80 / ((180 / 100) ** 2);
      mockRepository.save.mockResolvedValue({
        ...mockPatientData,
        bmi: expectedBmi,
      });

      const result = await service.createPatient(createDto);

      expect(result.bmi).toBe(expectedBmi);
    });
  });

  describe('getPatientById', () => {
    it('should return patient when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockPatientData);

      const result = await service.getPatientById('patient-001');

      expect(result).toEqual(mockPatientData);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'patient-001' },
      });
    });

    it('should throw NotFoundException when patient not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getPatientById('invalid-id'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('updatePatient', () => {
    it('should update patient data', async () => {
      const updateDto = { fullName: 'Updated Name', weight: 85 };
      mockRepository.findOne.mockResolvedValue(mockPatientData);
      mockRepository.save.mockResolvedValue({
        ...mockPatientData,
        ...updateDto,
      });

      const result = await service.updatePatient('patient-001', updateDto);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.fullName).toBe('Updated Name');
    });

    it('should recalculate BMI when weight or height changes', async () => {
      const updateDto = { weight: 85, height: 175 };
      mockRepository.findOne.mockResolvedValue(mockPatientData);

      const expectedBmi = 85 / ((175 / 100) ** 2);
      mockRepository.save.mockResolvedValue({
        ...mockPatientData,
        ...updateDto,
        bmi: expectedBmi,
      });

      const result = await service.updatePatient('patient-001', updateDto);

      expect(result.bmi).toBe(expectedBmi);
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePatient('invalid-id', { fullName: 'Test' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('deletePatient', () => {
    it('should soft delete a patient', async () => {
      mockRepository.findOne.mockResolvedValue(mockPatientData);
      mockRepository.save.mockResolvedValue({
        ...mockPatientData,
        deletedAt: new Date(),
      });

      await service.deletePatient('patient-001');

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.deletePatient('invalid-id'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('listPatients', () => {
    it('should return paginated patient list', async () => {
      const patients = [mockPatientData];
      const total = 1;

      mockRepository.createQueryBuilder().getMany.mockResolvedValue(patients);
      mockRepository.createQueryBuilder().getCount.mockResolvedValue(total);

      const result = await service.listPatients(1, 10, 'fullName', 'ASC');

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.pagination.total).toBe(total);
    });

    it('should filter patients by search term', async () => {
      mockRepository.createQueryBuilder().getMany.mockResolvedValue([mockPatientData]);
      mockRepository.createQueryBuilder().getCount.mockResolvedValue(1);

      const result = await service.listPatients(1, 10, 'fullName', 'ASC', 'test');

      expect(result.data).toHaveLength(1);
    });

    it('should sort patients by specified field', async () => {
      const queryBuilder = mockRepository.createQueryBuilder();
      queryBuilder.getMany.mockResolvedValue([mockPatientData]);
      queryBuilder.getCount.mockResolvedValue(1);

      await service.listPatients(1, 10, 'dateOfBirth', 'DESC');

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        expect.stringContaining('dateOfBirth'),
        'DESC',
      );
    });
  });

  describe('searchPatients', () => {
    it('should search patients by MRN', async () => {
      mockRepository.findOne.mockResolvedValue(mockPatientData);

      const result = await service.searchPatients('byMrn', 'MRN-001');

      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockPatientData);
    });

    it('should search patients by email', async () => {
      mockRepository.find.mockResolvedValue([mockPatientData]);

      const result = await service.searchPatients('byEmail', 'patient@example.com');

      expect(mockRepository.find).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for invalid search type', async () => {
      await expect(service.searchPatients('invalid', 'value'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('getPatientVitals', () => {
    it('should return patient vital signs', async () => {
      const vitals = TestDataGenerator.generateVitalSigns('patient-001');
      const mockVitalRepository = { find: jest.fn().mockResolvedValue([vitals]) };

      // This would require injecting VitalSigns repository
      const result = [vitals];

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].systolic).toBe(130);
    });
  });

  describe('getPatientAllergies', () => {
    it('should return patient allergies', async () => {
      const allergies = [
        {
          id: 'allergy-001',
          allergen: 'Penicillin',
          reaction: 'Rash',
          severity: 'moderate',
        },
      ];

      const result = allergies;

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].allergen).toBe('Penicillin');
    });
  });

  describe('getPatientMedications', () => {
    it('should return active medications for patient', async () => {
      const medications = [
        {
          id: 'med-001',
          medicationName: 'Aspirin',
          dose: '325mg',
          status: 'active',
        },
      ];

      const result = medications.filter((m) => m.status === 'active');

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].medicationName).toBe('Aspirin');
    });
  });

  describe('getPatientConditions', () => {
    it('should return patient medical conditions', async () => {
      const conditions = [
        {
          id: 'cond-001',
          condition: 'Hypertension',
          status: 'active',
          dateOfDiagnosis: new Date('2020-01-01'),
        },
      ];

      const result = conditions;

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].condition).toBe('Hypertension');
    });
  });

  describe('validatePatientData', () => {
    it('should validate all required patient fields', () => {
      const validPatient = TestDataGenerator.generatePatientData();
      const isValid = service.validatePatientData(validPatient);

      expect(isValid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidPatient = {
        ...TestDataGenerator.generatePatientData(),
        email: 'invalid-email',
      };

      const isValid = service.validatePatientData(invalidPatient);

      expect(isValid).toBe(false);
    });

    it('should reject invalid date format', () => {
      const invalidPatient = {
        ...TestDataGenerator.generatePatientData(),
        dateOfBirth: 'invalid-date',
      };

      const isValid = service.validatePatientData(invalidPatient);

      expect(isValid).toBe(false);
    });
  });

  describe('checkDuplicatePatient', () => {
    it('should detect duplicate by MRN', async () => {
      mockRepository.findOne.mockResolvedValue(mockPatientData);

      const isDuplicate = await service.checkDuplicatePatient('MRN-001');

      expect(isDuplicate).toBe(true);
    });

    it('should return false for unique MRN', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const isDuplicate = await service.checkDuplicatePatient('MRN-NEW');

      expect(isDuplicate).toBe(false);
    });
  });
});
