import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PatientsService } from './patients.service';
import { Patient, PatientStatus } from '@entities/patient.entity';

function mockQueryBuilder(result: [any[], number]) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue(result),
  };
}

describe('PatientsService', () => {
  let service: PatientsService;
  let mockPatientRepository: any;

  beforeEach(async () => {
    mockPatientRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: getRepositoryToken(Patient), useValue: mockPatientRepository },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  describe('createPatient', () => {
    const validDto = {
      firstName: '  Jane  ',
      lastName: '  Doe  ',
      gender: 'FEMALE',
      dateOfBirth: '1990-01-01',
      email: 'JANE@EXAMPLE.COM',
    } as any;

    it('should create a patient with a generated MRN and trimmed name', async () => {
      mockPatientRepository.save.mockImplementation((p: any) => Promise.resolve(p));

      const result = await service.createPatient(validDto);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Doe');
      expect(result.email).toBe('jane@example.com');
      expect(result.mrn).toMatch(/^\d{12}$/);
      expect(result.patientId).toBe(`P-${result.mrn}`);
      expect(result.status).toBe(PatientStatus.ACTIVE);
    });

    it('should throw BadRequestException if first or last name is missing', async () => {
      await expect(
        service.createPatient({ ...validDto, firstName: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if gender is missing', async () => {
      await expect(
        service.createPatient({ ...validDto, gender: undefined }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if date of birth is missing', async () => {
      await expect(
        service.createPatient({ ...validDto, dateOfBirth: undefined }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for an implausible date of birth', async () => {
      await expect(
        service.createPatient({ ...validDto, dateOfBirth: '1800-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllPatients', () => {
    it('should return paginated patients', async () => {
      const patients = [{ id: 'p1' }];
      mockPatientRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder([patients, 1]),
      );

      const result = await service.getAllPatients(0, 20);

      expect(result.data).toBe(patients);
      expect(result.total).toBe(1);
    });
  });

  describe('getPatientById', () => {
    it('should return the patient when found', async () => {
      const patient = { id: 'p1' };
      mockPatientRepository.findOne.mockResolvedValue(patient);

      const result = await service.getPatientById('p1');

      expect(result).toBe(patient);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(service.getPatientById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getPatientByMRN', () => {
    it('should return null when no patient matches', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      const result = await service.getPatientByMRN('nope');

      expect(result).toBeNull();
    });
  });

  describe('updatePatient', () => {
    it('should update only provided fields', async () => {
      const patient = { id: 'p1', firstName: 'Old', lastName: 'Name', email: 'old@x.com' };
      mockPatientRepository.findOne.mockResolvedValue(patient);
      mockPatientRepository.save.mockImplementation((p: any) => Promise.resolve(p));

      const result = await service.updatePatient('p1', { firstName: 'New' } as any);

      expect(result.firstName).toBe('New');
      expect(result.lastName).toBe('Name');
    });

    it('should throw NotFoundException if the patient does not exist', async () => {
      mockPatientRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePatient('missing', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchPatients', () => {
    it('should build a filtered query and return results', async () => {
      const qb = mockQueryBuilder([[{ id: 'p1' }], 1]);
      mockPatientRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchPatients({ lastName: 'Doe' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'patient.lastName ILIKE :lastName',
        { lastName: '%Doe%' },
      );
      expect(result.total).toBe(1);
    });
  });

  describe('deletePatient', () => {
    it('should soft-remove the patient', async () => {
      const patient = { id: 'p1', patientId: 'P-1' };
      mockPatientRepository.findOne.mockResolvedValue(patient);

      await service.deletePatient('p1');

      expect(mockPatientRepository.softRemove).toHaveBeenCalledWith(patient);
    });
  });

  describe('getPatientVitalSigns', () => {
    it('should sort and paginate the patient vital signs relation', async () => {
      const patient = {
        id: 'p1',
        vitalSigns: [
          { measuredAt: '2026-01-01', value: 'old' },
          { measuredAt: '2026-02-01', value: 'new' },
        ],
      };
      mockPatientRepository.findOne.mockResolvedValue(patient);

      const result = await service.getPatientVitalSigns('p1', 0, 20);

      expect(result.total).toBe(2);
      expect(result.data[0].value).toBe('new');
    });
  });

  describe('getActivePatients', () => {
    it('should filter by ACTIVE status', async () => {
      mockPatientRepository.findAndCount.mockResolvedValue([[{ id: 'p1' }], 1]);

      const result = await service.getActivePatients(0, 20);

      expect(mockPatientRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: PatientStatus.ACTIVE } }),
      );
      expect(result.total).toBe(1);
    });
  });
});
