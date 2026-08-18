import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConditionsService } from './conditions.service';
import { PatientCondition } from '@entities/patient-condition.entity';

describe('ConditionsService', () => {
  let service: ConditionsService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConditionsService,
        {
          provide: getRepositoryToken(PatientCondition),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ConditionsService>(ConditionsService);
  });

  describe('addCondition', () => {
    it('should add new condition to patient', async () => {
      const conditionData = {
        patientId: 'patient-001',
        condition: 'Hypertension',
        status: 'active',
        dateOfDiagnosis: new Date('2020-01-01'),
      };

      mockRepository.save.mockResolvedValue({ id: 'cond-001', ...conditionData });

      const result = await service.addCondition(conditionData);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.condition).toBe('Hypertension');
    });

    it('should validate condition status', () => {
      const validStatuses = ['active', 'resolved', 'chronic'];

      validStatuses.forEach(status => {
        expect(service.isValidStatus(status)).toBe(true);
      });
    });

    it('should reject invalid condition status', () => {
      expect(service.isValidStatus('invalid-status')).toBe(false);
    });
  });

  describe('getPatientConditions', () => {
    it('should return all active conditions', async () => {
      const conditions = [
        { id: 'cond-001', condition: 'Hypertension', status: 'active' },
        { id: 'cond-002', condition: 'Diabetes', status: 'active' },
      ];

      mockRepository.find.mockResolvedValue(conditions);

      const result = await service.getActiveConditions('patient-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should return empty array if no conditions', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getPatientConditions('patient-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('resolveCondition', () => {
    it('should mark condition as resolved', async () => {
      const condition = {
        id: 'cond-001',
        condition: 'Bronchitis',
        status: 'active',
      };

      mockRepository.findOne.mockResolvedValue(condition);
      mockRepository.save.mockResolvedValue({
        ...condition,
        status: 'resolved',
        resolvedAt: new Date(),
      });

      const result = await service.resolveCondition('cond-001');

      expect(result.status).toBe('resolved');
    });

    it('should throw NotFoundException if condition not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.resolveCondition('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getComorbidities', () => {
    it('should return patient comorbidities', async () => {
      const conditions = [
        { condition: 'Hypertension' },
        { condition: 'Diabetes' },
        { condition: 'CAD' },
      ];

      mockRepository.find.mockResolvedValue(conditions);

      const result = await service.getComorbidities('patient-001');

      expect(result.length).toBe(3);
    });

    it('should identify major comorbidities', async () => {
      const conditions = [
        { condition: 'Hypertension', severity: 'high' },
        { condition: 'Diabetes', severity: 'high' },
        { condition: 'Anxiety', severity: 'low' },
      ];

      mockRepository.find.mockResolvedValue(conditions);

      const major = conditions.filter(c => c.severity === 'high');

      expect(major.length).toBe(2);
    });
  });

  describe('updateConditionStatus', () => {
    it('should update condition status', async () => {
      const condition = {
        id: 'cond-001',
        condition: 'Hypertension',
        status: 'active',
      };

      mockRepository.findOne.mockResolvedValue(condition);
      mockRepository.save.mockResolvedValue({
        ...condition,
        status: 'resolved',
      });

      const result = await service.updateStatus('cond-001', 'resolved');

      expect(result.status).toBe('resolved');
    });
  });

  describe('getConditionHistory', () => {
    it('should return condition timeline', async () => {
      const conditions = [
        {
          condition: 'Hypertension',
          dateOfDiagnosis: new Date('2018-01-01'),
          status: 'active',
        },
        {
          condition: 'Bronchitis',
          dateOfDiagnosis: new Date('2022-03-15'),
          status: 'resolved',
        },
      ];

      mockRepository.find.mockResolvedValue(conditions);

      const result = await service.getConditionHistory('patient-001');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('checkHighRiskConditions', () => {
    it('should identify high-risk conditions', async () => {
      const highRiskConditions = [
        'Myocardial Infarction',
        'Stroke',
        'Cancer',
        'Heart Failure',
      ];

      const conditions = [
        { condition: 'Hypertension' },
        { condition: 'Myocardial Infarction' },
      ];

      mockRepository.find.mockResolvedValue(conditions);

      const result = await service.hasHighRiskCondition('patient-001');

      expect(result).toBe(true);
    });

    it('should return false if no high-risk conditions', async () => {
      const conditions = [
        { condition: 'Hypertension' },
        { condition: 'Anxiety' },
      ];

      mockRepository.find.mockResolvedValue(conditions);

      const result = await service.hasHighRiskCondition('patient-001');

      expect(result).toBe(false);
    });
  });

  describe('getConditionDuration', () => {
    it('should calculate condition duration', async () => {
      const condition = {
        dateOfDiagnosis: new Date('2020-01-01'),
        status: 'active',
      };

      const duration = service.calculateDuration(
        condition.dateOfDiagnosis,
        new Date('2026-08-16'),
      );

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });

    it('should return 0 for resolved conditions', async () => {
      const condition = {
        dateOfDiagnosis: new Date('2022-01-01'),
        resolvedAt: new Date('2022-06-01'),
      };

      const duration = service.calculateDuration(
        condition.dateOfDiagnosis,
        condition.resolvedAt,
      );

      expect(typeof duration).toBe('number');
    });
  });

  describe('searchConditions', () => {
    it('should search conditions by name', async () => {
      const conditions = [
        { id: 'cond-001', condition: 'Hypertension' },
      ];

      mockRepository.find.mockResolvedValue(conditions);

      const result = await service.searchByName('Hyper');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getConditionSeverity', () => {
    it('should return condition severity level', async () => {
      const condition = {
        condition: 'Hypertension',
        severity: 'moderate',
      };

      mockRepository.findOne.mockResolvedValue(condition);

      const result = await service.getSeverity('cond-001');

      expect(result).toBe('moderate');
    });
  });
});
