import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MedicationsService } from './medications.service';
import { PatientMedication, MedicationStatus } from '@entities/index';
import { Patient } from '@entities/patient.entity';

describe('MedicationsService', () => {
  let service: MedicationsService;
  let mockMedicationRepository: any;
  let mockPatientRepository: any;

  beforeEach(async () => {
    mockMedicationRepository = {
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
        MedicationsService,
        { provide: getRepositoryToken(PatientMedication), useValue: mockMedicationRepository },
        { provide: getRepositoryToken(Patient), useValue: mockPatientRepository },
      ],
    }).compile();

    service = module.get<MedicationsService>(MedicationsService);
  });

  describe('addMedication', () => {
    it('should create an active medication for an existing patient', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      mockMedicationRepository.save.mockImplementation((m: any) => Promise.resolve(m));

      const result = await service.addMedication(
        'patient-001',
        '  Amoxicillin  ',
        '500mg',
        'twice daily',
      );

      expect(result.medicationName).toBe('Amoxicillin');
      expect(result.status).toBe(MedicationStatus.ACTIVE);
    });

    it('should throw BadRequestException if the medication name is missing', async () => {
      await expect(service.addMedication('patient-001', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if the patient does not exist', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(service.addMedication('missing', 'Ibuprofen')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getActivePatientMedications', () => {
    it('should return only active medications', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      const meds = [{ id: 'm1', status: MedicationStatus.ACTIVE }];
      mockMedicationRepository.find.mockResolvedValue(meds);

      const result = await service.getActivePatientMedications('patient-001');

      expect(result).toBe(meds);
      expect(mockMedicationRepository.find).toHaveBeenCalledWith({
        where: { patientId: 'patient-001', status: MedicationStatus.ACTIVE },
        order: { startDate: 'DESC' },
      });
    });

    it('should throw NotFoundException if the patient does not exist', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getActivePatientMedications('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPatientMedications', () => {
    it('should return all medications regardless of status', async () => {
      mockPatientRepository.findOne.mockResolvedValue({ id: 'patient-001' });
      const meds = [{ id: 'm1' }, { id: 'm2' }];
      mockMedicationRepository.find.mockResolvedValue(meds);

      const result = await service.getPatientMedications('patient-001');

      expect(result).toBe(meds);
    });
  });

  describe('updateMedication', () => {
    it('should update only the provided fields', async () => {
      const medication = { id: 'm1', medicationName: 'Old', dose: '10mg', frequency: 'daily' };
      mockMedicationRepository.findOne.mockResolvedValue(medication);
      mockMedicationRepository.save.mockImplementation((m: any) => Promise.resolve(m));

      const result = await service.updateMedication('m1', 'patient-001', 'New name');

      expect(result.medicationName).toBe('New name');
      expect(result.dose).toBe('10mg');
    });

    it('should throw NotFoundException if the medication does not exist', async () => {
      mockMedicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateMedication('missing', 'patient-001', 'x'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('discontinueMedication', () => {
    it('should set status to DISCONTINUED and stamp an end date', async () => {
      const medication = { id: 'm1', status: MedicationStatus.ACTIVE };
      mockMedicationRepository.findOne.mockResolvedValue(medication);
      mockMedicationRepository.save.mockImplementation((m: any) => Promise.resolve(m));

      const result = await service.discontinueMedication('m1', 'patient-001');

      expect(result.status).toBe(MedicationStatus.DISCONTINUED);
      expect(result.endDate).toBeInstanceOf(Date);
    });
  });

  describe('suspendMedication', () => {
    it('should set status to SUSPENDED', async () => {
      const medication = { id: 'm1', status: MedicationStatus.ACTIVE };
      mockMedicationRepository.findOne.mockResolvedValue(medication);
      mockMedicationRepository.save.mockImplementation((m: any) => Promise.resolve(m));

      const result = await service.suspendMedication('m1', 'patient-001');

      expect(result.status).toBe(MedicationStatus.SUSPENDED);
    });
  });

  describe('resumeMedication', () => {
    it('should set status back to ACTIVE', async () => {
      const medication = { id: 'm1', status: MedicationStatus.SUSPENDED };
      mockMedicationRepository.findOne.mockResolvedValue(medication);
      mockMedicationRepository.save.mockImplementation((m: any) => Promise.resolve(m));

      const result = await service.resumeMedication('m1', 'patient-001');

      expect(result.status).toBe(MedicationStatus.ACTIVE);
    });

    it('should throw NotFoundException if the medication does not exist', async () => {
      mockMedicationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resumeMedication('missing', 'patient-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
