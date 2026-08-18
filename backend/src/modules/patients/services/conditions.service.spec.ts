import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConditionsService } from './conditions.service';
import { PatientCondition, ConditionStatus } from '@entities/index';
import { Patient } from '@entities/patient.entity';

describe('ConditionsService', () => {
  let service: ConditionsService;
  let mockConditionRepository: any;
  let mockPatientRepository: any;

  beforeEach(async () => {
    mockConditionRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockPatientRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConditionsService,
        {
          provide: getRepositoryToken(PatientCondition),
          useValue: mockConditionRepository,
        },
        {
          provide: getRepositoryToken(Patient),
          useValue: mockPatientRepository,
        },
      ],
    }).compile();

    service = module.get<ConditionsService>(ConditionsService);
  });

  describe('addCondition', () => {
    it('should create an active condition for an existing patient', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      mockConditionRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.addCondition('patient-001', '  Hypertension  ', 'I10', 'moderate');

      expect(result.conditionName).toBe('Hypertension');
      expect(result.status).toBe(ConditionStatus.ACTIVE);
      expect(mockConditionRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if the condition name is missing', async () => {
      await expect(service.addCondition('patient-001', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if the patient does not exist', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(service.addCondition('missing', 'Asthma')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getActivePatientConditions', () => {
    it('should return only active conditions', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      const conditions = [{ id: 'c1', status: ConditionStatus.ACTIVE }];
      mockConditionRepository.find.mockResolvedValue(conditions);

      const result = await service.getActivePatientConditions('patient-001');

      expect(result).toBe(conditions);
      expect(mockConditionRepository.find).toHaveBeenCalledWith({
        where: { patientId: 'patient-001', status: ConditionStatus.ACTIVE },
        order: { onsetDate: 'DESC' },
      });
    });

    it('should throw NotFoundException if the patient does not exist', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(service.getActivePatientConditions('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPatientConditions', () => {
    it('should return all conditions regardless of status', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      const conditions = [{ id: 'c1' }, { id: 'c2' }];
      mockConditionRepository.find.mockResolvedValue(conditions);

      const result = await service.getPatientConditions('patient-001');

      expect(result).toBe(conditions);
    });
  });

  describe('updateCondition', () => {
    it('should update only the provided fields', async () => {
      const condition = {
        id: 'c1',
        conditionName: 'Old name',
        icdCode: 'X00',
        severity: 'mild',
      };
      mockConditionRepository.findOne.mockResolvedValue(condition);
      mockConditionRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.updateCondition('c1', 'patient-001', 'New name');

      expect(result.conditionName).toBe('New name');
      expect(result.icdCode).toBe('X00');
    });

    it('should throw NotFoundException if the condition does not exist', async () => {
      mockConditionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCondition('missing', 'patient-001', 'x'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveCondition', () => {
    it('should set status to RESOLVED and stamp a resolution date', async () => {
      const condition = { id: 'c1', status: ConditionStatus.ACTIVE, resolutionDate: null };
      mockConditionRepository.findOne.mockResolvedValue(condition);
      mockConditionRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.resolveCondition('c1', 'patient-001');

      expect(result.status).toBe(ConditionStatus.RESOLVED);
      expect(result.resolutionDate).toBeInstanceOf(Date);
    });
  });

  describe('markRemission', () => {
    it('should set status to REMISSION', async () => {
      const condition = { id: 'c1', status: ConditionStatus.ACTIVE };
      mockConditionRepository.findOne.mockResolvedValue(condition);
      mockConditionRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.markRemission('c1', 'patient-001');

      expect(result.status).toBe(ConditionStatus.REMISSION);
    });
  });

  describe('reactivateCondition', () => {
    it('should set status back to ACTIVE and clear the resolution date', async () => {
      const condition = {
        id: 'c1',
        status: ConditionStatus.RESOLVED,
        resolutionDate: new Date(),
      };
      mockConditionRepository.findOne.mockResolvedValue(condition);
      mockConditionRepository.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.reactivateCondition('c1', 'patient-001');

      expect(result.status).toBe(ConditionStatus.ACTIVE);
      expect(result.resolutionDate).toBeNull();
    });
  });

  describe('hasCriticalConditions', () => {
    it('should return true if an active condition name matches a critical term', async () => {
      mockConditionRepository.find.mockResolvedValue([
        { conditionName: 'Congestive Heart Failure' },
      ]);

      const result = await service.hasCriticalConditions('patient-001');

      expect(result).toBe(true);
    });

    it('should return false if no active condition matches a critical term', async () => {
      mockConditionRepository.find.mockResolvedValue([{ conditionName: 'Seasonal allergies' }]);

      const result = await service.hasCriticalConditions('patient-001');

      expect(result).toBe(false);
    });
  });
});
