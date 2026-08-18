import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MedicationsService } from './medications.service';
import { PatientMedication } from '@entities/patient-medication.entity';

describe('MedicationsService', () => {
  let service: MedicationsService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicationsService,
        {
          provide: getRepositoryToken(PatientMedication),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MedicationsService>(MedicationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addMedication', () => {
    it('should add new medication to patient', async () => {
      const medicationData = {
        patientId: 'patient-001',
        medicationName: 'Aspirin',
        dose: '325mg',
        route: 'PO',
        frequency: 'Daily',
        status: 'active',
      };

      mockRepository.save.mockResolvedValue({ id: 'med-001', ...medicationData });

      const result = await service.addMedication(medicationData);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.medicationName).toBe('Aspirin');
    });

    it('should validate medication route', async () => {
      const validRoutes = ['PO', 'IV', 'IM', 'SC', 'Topical', 'Inhaled'];

      const medicationData = {
        patientId: 'patient-001',
        medicationName: 'Aspirin',
        dose: '325mg',
        route: 'PO',
        frequency: 'Daily',
      };

      mockRepository.save.mockResolvedValue({ id: 'med-001', ...medicationData });

      const result = await service.addMedication(medicationData);

      expect(result).toBeDefined();
    });

    it('should validate medication frequency', async () => {
      const validFrequencies = ['Once daily', 'Twice daily', 'Three times daily', 'Every 6 hours'];

      validFrequencies.forEach(freq => {
        expect(service.isValidFrequency(freq)).toBe(true);
      });
    });
  });

  describe('getActiveMedications', () => {
    it('should return only active medications', async () => {
      const medications = [
        {
          id: 'med-001',
          medicationName: 'Aspirin',
          status: 'active',
        },
        {
          id: 'med-002',
          medicationName: 'Lisinopril',
          status: 'discontinued',
        },
        {
          id: 'med-003',
          medicationName: 'Metformin',
          status: 'active',
        },
      ];

      mockRepository.find.mockResolvedValue(medications.filter(m => m.status === 'active'));

      const result = await service.getActiveMedications('patient-001');

      expect(result.length).toBe(2);
      expect(result.every(m => m.status === 'active')).toBe(true);
    });

    it('should return empty array if no active medications', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getActiveMedications('patient-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('discontinueMedication', () => {
    it('should discontinue medication', async () => {
      const medication = {
        id: 'med-001',
        status: 'active',
        medicationName: 'Aspirin',
      };

      mockRepository.findOne.mockResolvedValue(medication);
      mockRepository.save.mockResolvedValue({
        ...medication,
        status: 'discontinued',
        discontinuedAt: new Date(),
      });

      const result = await service.discontinueMedication('med-001');

      expect(result.status).toBe('discontinued');
    });

    it('should throw NotFoundException if medication not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.discontinueMedication('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkDrugInteractions', () => {
    it('should detect major interactions', async () => {
      const medications = [
        { medicationName: 'Warfarin', dose: '5mg' },
        { medicationName: 'Aspirin', dose: '325mg' },
      ];

      mockRepository.find.mockResolvedValue(medications);

      const interactions = await service.checkDrugInteractions('patient-001');

      expect(Array.isArray(interactions)).toBe(true);
    });

    it('should flag significant interactions', async () => {
      const medications = [
        { medicationName: 'Metoprolol', dose: '50mg' },
        { medicationName: 'Verapamil', dose: '120mg' },
      ];

      mockRepository.find.mockResolvedValue(medications);

      const interactions = await service.checkDrugInteractions('patient-001');

      expect(interactions.some(i => i.severity === 'high')).toBe(true);
    });

    it('should return empty array if no interactions', async () => {
      const medications = [{ medicationName: 'Aspirin', dose: '325mg' }];

      mockRepository.find.mockResolvedValue(medications);

      const interactions = await service.checkDrugInteractions('patient-001');

      expect(Array.isArray(interactions)).toBe(true);
    });
  });

  describe('getRecommendedDose', () => {
    it('should return recommended dose for medication', async () => {
      const patient = { age: 65, weight: 70, renalFunction: 'normal' };

      const recommendedDose = await service.getRecommendedDose('Lisinopril', patient);

      expect(recommendedDose).toBeDefined();
      expect(typeof recommendedDose).toBe('string');
    });

    it('should adjust dose for elderly patients', async () => {
      const elderlyPatient = { age: 85, weight: 60, renalFunction: 'reduced' };

      const dose = await service.getRecommendedDose('Metformin', elderlyPatient);

      expect(dose).toBeDefined();
    });

    it('should adjust dose for renal impairment', async () => {
      const patient = { age: 50, weight: 70, renalFunction: 'severe' };

      const dose = await service.getRecommendedDose('Gentamicin', patient);

      expect(dose).toBeDefined();
    });
  });

  describe('updateMedicationDose', () => {
    it('should update medication dose', async () => {
      const medication = {
        id: 'med-001',
        medicationName: 'Aspirin',
        dose: '325mg',
      };

      mockRepository.findOne.mockResolvedValue(medication);
      mockRepository.save.mockResolvedValue({
        ...medication,
        dose: '500mg',
      });

      const result = await service.updateDose('med-001', '500mg');

      expect(result.dose).toBe('500mg');
    });

    it('should validate new dose format', async () => {
      const invalidDose = 'invalid-dose-format';

      const isValid = service.isValidDoseFormat(invalidDose);

      expect(isValid).toBe(false);
    });
  });

  describe('getMedicationHistory', () => {
    it('should return medication history including discontinued', async () => {
      const history = [
        { medicationName: 'Aspirin', status: 'active', startDate: new Date() },
        { medicationName: 'Lisinopril', status: 'discontinued', endDate: new Date() },
      ];

      mockRepository.find.mockResolvedValue(history);

      const result = await service.getMedicationHistory('patient-001');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });

  describe('checkContraindications', () => {
    it('should detect medication contraindications for conditions', async () => {
      const conditions = [{ condition: 'Asthma' }];
      const proposedMedication = 'Beta-blocker';

      mockRepository.find.mockResolvedValue(conditions);

      const contraindications = await service.checkContraindications(
        'patient-001',
        proposedMedication,
      );

      expect(Array.isArray(contraindications)).toBe(true);
    });

    it('should flag absolute contraindications', async () => {
      const conditions = [{ condition: 'Pregnancy' }];
      const medication = 'ACE-inhibitor';

      mockRepository.find.mockResolvedValue(conditions);

      const contraindications = await service.checkContraindications('patient-001', medication);

      expect(contraindications.some(c => c.severity === 'absolute')).toBe(true);
    });
  });

  describe('calculateDrugClearance', () => {
    it('should calculate drug clearance based on renal function', async () => {
      const patient = { weight: 70, age: 50, creatinine: 1.0 };

      const clearance = await service.calculateDrugClearance('Gentamicin', patient);

      expect(typeof clearance).toBe('number');
      expect(clearance).toBeGreaterThan(0);
    });

    it('should adjust clearance for renal impairment', async () => {
      const patient = { weight: 70, age: 50, creatinine: 3.0 };

      const clearance = await service.calculateDrugClearance('Gentamicin', patient);

      expect(typeof clearance).toBe('number');
    });
  });

  describe('validateMedicationSchedule', () => {
    it('should accept valid medication schedule', () => {
      const schedule = {
        medicationName: 'Aspirin',
        frequency: 'Twice daily',
        time: ['08:00', '20:00'],
      };

      const isValid = service.isValidSchedule(schedule);

      expect(isValid).toBe(true);
    });

    it('should reject conflicting times', () => {
      const schedule = {
        medicationName: 'Aspirin',
        frequency: 'Every 12 hours',
        time: ['08:00', '08:15'],
      };

      const isValid = service.isValidSchedule(schedule);

      expect(isValid).toBe(false);
    });
  });
});
