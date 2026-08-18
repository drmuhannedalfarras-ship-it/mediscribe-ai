import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VitalSignsService } from './vital-signs.service';
import { VitalSigns } from '@entities/vital-signs.entity';
import { Patient } from '@entities/patient.entity';
import { User } from '@entities/user.entity';

function withBmi(data: any) {
  return {
    ...data,
    calculateBMI(): number | null {
      if (!this.height || !this.weight) {
        return null;
      }
      const heightInMeters = this.height / 100;
      return Math.round((this.weight / (heightInMeters * heightInMeters)) * 100) / 100;
    },
  };
}

describe('VitalSignsService', () => {
  let service: VitalSignsService;
  let mockVitalSignsRepository: any;
  let mockPatientRepository: any;
  let mockUserRepository: any;

  beforeEach(async () => {
    mockVitalSignsRepository = {
      create: jest.fn((data) => withBmi(data)),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
    };

    mockPatientRepository = {
      findOne: jest.fn(),
    };

    mockUserRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VitalSignsService,
        { provide: getRepositoryToken(VitalSigns), useValue: mockVitalSignsRepository },
        { provide: getRepositoryToken(Patient), useValue: mockPatientRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<VitalSignsService>(VitalSignsService);
  });

  describe('recordVitalSigns', () => {
    it('should record vital signs and compute BMI', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      mockVitalSignsRepository.save.mockImplementation((v: any) => Promise.resolve(v));

      const result = await service.recordVitalSigns('patient-001', {
        height: 180,
        weight: 80,
        systolicBP: 120,
        diastolicBP: 80,
        pulse: 70,
        temperature: 37,
        respiratoryRate: 16,
        spO2: 98,
      } as any);

      expect(result.bmi).toBeCloseTo(24.69);
      expect(mockVitalSignsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if the patient does not exist', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(
        service.recordVitalSigns('missing', { pulse: 70 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if a value is out of range', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });

      await expect(
        service.recordVitalSigns('patient-001', { pulse: 400 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLatestVitalSigns', () => {
    it('should return the most recent record', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      const latest = { id: 'v1' };
      mockVitalSignsRepository.findOne.mockResolvedValue(latest);

      const result = await service.getLatestVitalSigns('patient-001');

      expect(result).toBe(latest);
    });

    it('should throw NotFoundException if the patient does not exist', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(service.getLatestVitalSigns('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getVitalSignsHistory', () => {
    it('should return paginated history', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      mockVitalSignsRepository.findAndCount.mockResolvedValue([[{ id: 'v1' }], 1]);

      const result = await service.getVitalSignsHistory('patient-001', 0, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getVitalSignsByDateRange', () => {
    it('should return records within range for an existing patient', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      const records = [{ id: 'v1' }];
      mockVitalSignsRepository.find.mockResolvedValue(records);

      const result = await service.getVitalSignsByDateRange(
        'patient-001',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result).toBe(records);
    });
  });

  describe('updateVitalSigns', () => {
    it('should update only provided fields and recompute BMI', async () => {
      mockVitalSignsRepository.findOne.mockResolvedValue(
        withBmi({ id: 'v1', patientId: 'patient-001', height: 180, weight: 80, pulse: 70 }),
      );
      mockVitalSignsRepository.save.mockImplementation((v: any) => Promise.resolve(v));

      const result = await service.updateVitalSigns('patient-001', 'v1', { weight: 90 } as any);

      expect(result.weight).toBe(90);
      expect(result.pulse).toBe(70);
      expect(result.bmi).toBeCloseTo(27.78);
    });

    it('should throw NotFoundException if the record does not exist', async () => {
      mockVitalSignsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateVitalSigns('patient-001', 'missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if an updated value is out of range', async () => {
      mockVitalSignsRepository.findOne.mockResolvedValue(withBmi({ id: 'v1' }));

      await expect(
        service.updateVitalSigns('patient-001', 'v1', { spO2: 10 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkForAbnormalities', () => {
    it('should flag fever, hypertensive crisis, tachycardia, low SpO2, and tachypnea', () => {
      const result = service.checkForAbnormalities({
        temperature: 39,
        systolicBP: 190,
        diastolicBP: 125,
        pulse: 110,
        spO2: 88,
        respiratoryRate: 25,
      } as VitalSigns);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Fever'),
          expect.stringContaining('Hypertensive crisis'),
          expect.stringContaining('Tachycardia'),
          expect.stringContaining('Low oxygen saturation'),
          expect.stringContaining('Tachypnea'),
        ]),
      );
    });

    it('should return an empty list for normal vital signs', () => {
      const result = service.checkForAbnormalities({
        temperature: 37,
        systolicBP: 120,
        diastolicBP: 80,
        pulse: 70,
        spO2: 98,
        respiratoryRate: 16,
      } as VitalSigns);

      expect(result).toEqual([]);
    });
  });
});
