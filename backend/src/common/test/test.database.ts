import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Test database configuration
 * Uses in-memory SQLite for fast test execution
 */
export const testDatabaseConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: ':memory:',
  entities: ['src/entities/**/*.entity.ts'],
  synchronize: true,
  logging: false,
  dropSchema: true,
};

/**
 * Test database factory
 */
export class TestDatabaseFactory {
  /**
   * Create test database module config
   */
  static createTestDatabaseConfig(options: any = {}): TypeOrmModuleOptions {
    return {
      ...testDatabaseConfig,
      ...options,
    };
  }

  /**
   * Create test seeds
   */
  static async seedTestDatabase(connection: any) {
    // Seed test users
    const userRepository = connection.getRepository('User');
    await userRepository.insert([
      {
        id: 'user-test-001',
        email: 'physician@mediscribe.test',
        passwordHash: '$2b$10$Nx0FWZ9qsD8L5zv9k5K5p.Qr0LmFjL5K5K5K5K5K5K5K5K5K5K5K5',
        fullName: 'Dr. Test Physician',
        role: 'PHYSICIAN',
        isActive: true,
      },
      {
        id: 'user-test-002',
        email: 'admin@mediscribe.test',
        passwordHash: '$2b$10$Nx0FWZ9qsD8L5zv9k5K5p.Qr0LmFjL5K5K5K5K5K5K5K5K5K5K5K5',
        fullName: 'Admin User',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      {
        id: 'user-test-003',
        email: 'nurse@mediscribe.test',
        passwordHash: '$2b$10$Nx0FWZ9qsD8L5zv9k5K5p.Qr0LmFjL5K5K5K5K5K5K5K5K5K5K5K5',
        fullName: 'Nurse User',
        role: 'NURSE',
        isActive: true,
      },
    ]);

    // Seed test patients
    const patientRepository = connection.getRepository('Patient');
    await patientRepository.insert([
      {
        id: 'patient-test-001',
        mrn: 'MRN-001',
        fullName: 'John Test Patient',
        dateOfBirth: new Date('1980-01-15'),
        gender: 'M',
        nationality: 'US',
        email: 'patient1@example.com',
        phone: '+1-555-0001',
        height: 180,
        weight: 80,
      },
      {
        id: 'patient-test-002',
        mrn: 'MRN-002',
        fullName: 'Jane Test Patient',
        dateOfBirth: new Date('1985-05-20'),
        gender: 'F',
        nationality: 'US',
        email: 'patient2@example.com',
        phone: '+1-555-0002',
        height: 165,
        weight: 65,
      },
    ]);

    // Seed test allergies
    const allergyRepository = connection.getRepository('PatientAllergy');
    await allergyRepository.insert([
      {
        id: 'allergy-test-001',
        patientId: 'patient-test-001',
        allergen: 'Penicillin',
        reaction: 'Rash',
        severity: 'moderate',
      },
    ]);

    // Seed test medications
    const medicationRepository = connection.getRepository('PatientMedication');
    await medicationRepository.insert([
      {
        id: 'med-test-001',
        patientId: 'patient-test-001',
        medicationName: 'Aspirin',
        dose: '325mg',
        route: 'PO',
        frequency: 'Daily',
        status: 'active',
      },
    ]);

    return connection;
  }

  /**
   * Clear test database
   */
  static async clearTestDatabase(connection: any) {
    const entities = connection.entityMetadatas;

    for (const entity of entities) {
      const repository = connection.getRepository(entity.name);
      await repository.query(`DELETE FROM ${entity.tableName}`);
    }
  }
}

/**
 * Test data seeder helper
 */
export class TestDataSeeder {
  constructor(private connection: any) {}

  /**
   * Seed a single user
   */
  async seedUser(overrides: any = {}) {
    const userRepository = this.connection.getRepository('User');
    const user = {
      id: 'user-seed-' + Math.random().toString(36).substr(2, 9),
      email: `test-${Date.now()}@mediscribe.test`,
      passwordHash: '$2b$10$Nx0FWZ9qsD8L5zv9k5K5p.Qr0LmFjL5K5K5K5K5K5K5K5K5K5K5K5',
      fullName: 'Test User',
      role: 'PHYSICIAN',
      isActive: true,
      ...overrides,
    };
    await userRepository.insert(user);
    return user;
  }

  /**
   * Seed a single patient
   */
  async seedPatient(overrides: any = {}) {
    const patientRepository = this.connection.getRepository('Patient');
    const patient = {
      id: 'patient-seed-' + Math.random().toString(36).substr(2, 9),
      mrn: 'MRN-' + Date.now(),
      fullName: 'Test Patient',
      dateOfBirth: new Date('1980-01-15'),
      gender: 'M',
      nationality: 'US',
      email: `patient-${Date.now()}@example.com`,
      phone: '+1-555-0000',
      height: 180,
      weight: 80,
      ...overrides,
    };
    await patientRepository.insert(patient);
    return patient;
  }

  /**
   * Seed a single consultation
   */
  async seedConsultation(patientId: string, physicianId: string, overrides: any = {}) {
    const consultationRepository = this.connection.getRepository('Consultation');
    const consultation = {
      id: 'consul-seed-' + Math.random().toString(36).substr(2, 9),
      patientId,
      physicianId,
      department: 'General Medicine',
      specialty: 'Internal Medicine',
      reasonForVisit: 'Routine checkup',
      status: 'SCHEDULED',
      ...overrides,
    };
    await consultationRepository.insert(consultation);
    return consultation;
  }

  /**
   * Seed a single allergy
   */
  async seedAllergy(patientId: string, overrides: any = {}) {
    const allergyRepository = this.connection.getRepository('PatientAllergy');
    const allergy = {
      id: 'allergy-seed-' + Math.random().toString(36).substr(2, 9),
      patientId,
      allergen: 'Test Allergen',
      reaction: 'Rash',
      severity: 'mild',
      ...overrides,
    };
    await allergyRepository.insert(allergy);
    return allergy;
  }

  /**
   * Seed multiple items
   */
  async seed(seedFn: () => Promise<any>) {
    return seedFn();
  }
}
