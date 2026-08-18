import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VitalSignsService } from './vital-signs.service';
import { PatientVitalSigns } from '@entities/patient-vital-signs.entity';

describe('VitalSignsService', () => {
  let service: VitalSignsService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      query: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VitalSignsService,
        {
          provide: getRepositoryToken(PatientVitalSigns),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<VitalSignsService>(VitalSignsService);
  });

  describe('recordVitalSigns', () => {
    it('should record vital signs for patient', async () => {
      const vitals = {
        patientId: 'patient-001',
        systolic: 130,
        diastolic: 80,
        heartRate: 70,
        temperature: 98.6,
        respiratoryRate: 16,
        oxygenSaturation: 98,
      };

      mockRepository.save.mockResolvedValue({ id: 'vitals-001', ...vitals });

      const result = await service.recordVitalSigns(vitals);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.systolic).toBe(130);
    });

    it('should validate vital signs ranges', () => {
      const vitals = {
        systolic: 130,
        diastolic: 80,
        heartRate: 70,
        temperature: 98.6,
      };

      const isValid = service.validateVitals(vitals);

      expect(isValid).toBe(true);
    });

    it('should reject out-of-range vital signs', () => {
      const invalidVitals = {
        systolic: 300, // Too high
        diastolic: 80,
        heartRate: 70,
      };

      const isValid = service.validateVitals(invalidVitals);

      expect(isValid).toBe(false);
    });
  });

  describe('getLatestVitalSigns', () => {
    it('should return latest vital signs', async () => {
      const latestVitals = {
        patientId: 'patient-001',
        systolic: 130,
        diastolic: 80,
        heartRate: 72,
        date: new Date(),
      };

      mockRepository.createQueryBuilder().getMany.mockResolvedValue([latestVitals]);

      const result = await service.getLatestVitalSigns('patient-001');

      expect(result).toBeDefined();
      expect(result.systolic).toBe(130);
    });

    it('should return null if no vital signs recorded', async () => {
      mockRepository.createQueryBuilder().getMany.mockResolvedValue([]);

      const result = await service.getLatestVitalSigns('patient-001');

      expect(result).toBeUndefined();
    });
  });

  describe('getVitalSignsHistory', () => {
    it('should return vital signs history', async () => {
      const history = [
        {
          systolic: 130,
          diastolic: 80,
          date: new Date('2026-08-10'),
        },
        {
          systolic: 128,
          diastolic: 79,
          date: new Date('2026-08-15'),
        },
      ];

      mockRepository.find.mockResolvedValue(history);

      const result = await service.getVitalSignsHistory('patient-001', 30);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('detectAbnormalVitals', () => {
    it('should flag hypertension', () => {
      const vitals = {
        systolic: 160,
        diastolic: 100,
        heartRate: 70,
      };

      const abnormalities = service.detectAbnormalities(vitals);

      expect(abnormalities.some(a => a.type === 'hypertension')).toBe(true);
    });

    it('should flag hypotension', () => {
      const vitals = {
        systolic: 85,
        diastolic: 50,
        heartRate: 70,
      };

      const abnormalities = service.detectAbnormalities(vitals);

      expect(abnormalities.some(a => a.type === 'hypotension')).toBe(true);
    });

    it('should flag tachycardia', () => {
      const vitals = {
        systolic: 120,
        diastolic: 80,
        heartRate: 110,
      };

      const abnormalities = service.detectAbnormalities(vitals);

      expect(abnormalities.some(a => a.type === 'tachycardia')).toBe(true);
    });

    it('should flag bradycardia', () => {
      const vitals = {
        systolic: 120,
        diastolic: 80,
        heartRate: 45,
      };

      const abnormalities = service.detectAbnormalities(vitals);

      expect(abnormalities.some(a => a.type === 'bradycardia')).toBe(true);
    });

    it('should flag fever', () => {
      const vitals = {
        temperature: 102.5,
        heartRate: 70,
      };

      const abnormalities = service.detectAbnormalities(vitals);

      expect(abnormalities.some(a => a.type === 'fever')).toBe(true);
    });

    it('should flag hypoxemia', () => {
      const vitals = {
        oxygenSaturation: 88,
        heartRate: 70,
      };

      const abnormalities = service.detectAbnormalities(vitals);

      expect(abnormalities.some(a => a.type === 'hypoxemia')).toBe(true);
    });
  });

  describe('calculateBP Classification', () => {
    it('should classify normal blood pressure', () => {
      const classification = service.classifyBloodPressure(120, 80);

      expect(classification).toBe('Normal');
    });

    it('should classify elevated blood pressure', () => {
      const classification = service.classifyBloodPressure(130, 85);

      expect(classification).toBe('Elevated');
    });

    it('should classify stage 1 hypertension', () => {
      const classification = service.classifyBloodPressure(140, 90);

      expect(classification).toBe('Stage 1 Hypertension');
    });

    it('should classify stage 2 hypertension', () => {
      const classification = service.classifyBloodPressure(160, 100);

      expect(classification).toBe('Stage 2 Hypertension');
    });

    it('should classify hypertensive crisis', () => {
      const classification = service.classifyBloodPressure(180, 120);

      expect(classification).toBe('Hypertensive Crisis');
    });
  });

  describe('getVitalSignsTrend', () => {
    it('should identify increasing trend', async () => {
      const vitals = [
        { systolic: 120 },
        { systolic: 125 },
        { systolic: 130 },
        { systolic: 135 },
      ];

      mockRepository.find.mockResolvedValue(vitals);

      const trend = await service.getVitalSignsTrend('patient-001', 'systolic', 30);

      expect(trend.direction).toBe('increasing');
    });

    it('should identify decreasing trend', async () => {
      const vitals = [
        { systolic: 140 },
        { systolic: 135 },
        { systolic: 130 },
        { systolic: 120 },
      ];

      mockRepository.find.mockResolvedValue(vitals);

      const trend = await service.getVitalSignsTrend('patient-001', 'systolic', 30);

      expect(trend.direction).toBe('decreasing');
    });

    it('should identify stable trend', async () => {
      const vitals = [
        { systolic: 130 },
        { systolic: 131 },
        { systolic: 130 },
        { systolic: 129 },
      ];

      mockRepository.find.mockResolvedValue(vitals);

      const trend = await service.getVitalSignsTrend('patient-001', 'systolic', 30);

      expect(trend.direction).toBe('stable');
    });
  });

  describe('compareWithNormal', () => {
    it('should compare vital signs with normal ranges', () => {
      const vitals = {
        systolic: 130,
        diastolic: 80,
        heartRate: 70,
        temperature: 98.6,
        oxygenSaturation: 98,
      };

      const comparison = service.compareWithNormal(vitals);

      expect(comparison).toBeDefined();
      expect(comparison.heartRate.status).toBe('normal');
      expect(comparison.temperature.status).toBe('normal');
    });

    it('should flag abnormal values in comparison', () => {
      const vitals = {
        systolic: 170,
        diastolic: 100,
        heartRate: 50,
        temperature: 102,
      };

      const comparison = service.compareWithNormal(vitals);

      expect(comparison.systolic.status).toBe('abnormal');
      expect(comparison.temperature.status).toBe('abnormal');
    });
  });

  describe('getAverageVitalSigns', () => {
    it('should calculate average vital signs over period', async () => {
      const vitals = [
        { systolic: 130, diastolic: 80, heartRate: 70 },
        { systolic: 132, diastolic: 82, heartRate: 72 },
        { systolic: 128, diastolic: 78, heartRate: 68 },
      ];

      mockRepository.find.mockResolvedValue(vitals);

      const average = await service.getAverageVitalSigns('patient-001', 30);

      expect(average.systolic).toBe(130);
      expect(average.diastolic).toBe(80);
      expect(average.heartRate).toBe(70);
    });
  });

  describe('identifyCriticalValues', () => {
    it('should identify critical vital signs', async () => {
      const vitals = {
        systolic: 200,
        diastolic: 120,
        heartRate: 30,
        oxygenSaturation: 70,
      };

      mockRepository.save.mockResolvedValue(vitals);

      const critical = service.identifyCriticalValues(vitals);

      expect(critical.length).toBeGreaterThan(0);
    });
  });

  describe('calculatePulsePresure', () => {
    it('should calculate pulse pressure correctly', () => {
      const systolic = 140;
      const diastolic = 80;

      const pulsePressure = service.calculatePulsePressure(systolic, diastolic);

      expect(pulsePressure).toBe(60);
    });
  });

  describe('getVitalSignsStatistics', () => {
    it('should return vital signs statistics', async () => {
      const vitals = [
        { systolic: 130, diastolic: 80 },
        { systolic: 135, diastolic: 85 },
        { systolic: 125, diastolic: 75 },
      ];

      mockRepository.find.mockResolvedValue(vitals);

      const stats = await service.getVitalSignsStatistics('patient-001', 30);

      expect(stats.min).toBeDefined();
      expect(stats.max).toBeDefined();
      expect(stats.mean).toBeDefined();
      expect(stats.stdDev).toBeDefined();
    });
  });
});
