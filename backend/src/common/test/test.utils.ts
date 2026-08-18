import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate test user token
   */
  static generateToken(jwtService: JwtService, userId: string, role: string = 'PHYSICIAN'): string {
    return jwtService.sign({
      id: userId,
      email: `test-${userId}@mediscribe.test`,
      role,
    });
  }

  /**
   * Generate test patient data
   */
  static generatePatientData(id: string = 'PAT-001') {
    return {
      id,
      mrn: `MRN-${id}`,
      fullName: 'Test Patient',
      dateOfBirth: '1980-01-15',
      gender: 'M',
      nationality: 'US',
      email: 'patient@example.com',
      phone: '+1-000-0000',
      height: 180,
      weight: 80,
      address: '123 Test St',
    };
  }

  /**
   * Generate test consultation data
   */
  static generateConsultationData(patientId: string = 'PAT-001') {
    return {
      patientId,
      physicianId: 'PHYS-001',
      department: 'General Medicine',
      specialty: 'Internal Medicine',
      reasonForVisit: 'Chest pain',
      date: new Date(),
      status: 'SCHEDULED',
    };
  }

  /**
   * Generate test medication data
   */
  static generateMedicationData(patientId: string = 'PAT-001') {
    return {
      patientId,
      medicationName: 'Aspirin',
      dose: '325mg',
      route: 'PO',
      frequency: 'Daily',
      status: 'active',
      startDate: new Date(),
    };
  }

  /**
   * Generate test allergy data
   */
  static generateAllergyData(patientId: string = 'PAT-001') {
    return {
      patientId,
      allergen: 'Penicillin',
      reaction: 'Rash',
      severity: 'moderate',
      dateIdentified: new Date(),
    };
  }

  /**
   * Generate test vital signs
   */
  static generateVitalSigns(patientId: string = 'PAT-001') {
    return {
      patientId,
      systolic: 130,
      diastolic: 80,
      heartRate: 70,
      temperature: 98.6,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      date: new Date(),
    };
  }

  /**
   * Generate test clinical extraction
   */
  static generateClinicalExtraction(consultationId: string) {
    return {
      consultationId,
      extractedValue: 'Chest pain',
      clinicalCategory: 'Chief Complaint',
      status: 'POSITIVE',
      confidence: 0.95,
    };
  }

  /**
   * Generate test order data
   */
  static generateOrderData(consultationId: string) {
    return {
      consultationId,
      medicationName: 'Lisinopril',
      dose: '10mg',
      route: 'PO',
      frequency: 'Daily',
      indication: 'ACE inhibitor',
      priority: 'high',
    };
  }

  /**
   * Generate test escalation data
   */
  static generateEscalationData(consultationId: string) {
    return {
      consultationId,
      trigger: 'Chest pain with ECG changes',
      level: 'CRITICAL',
      target: 'EMERGENCY_DEPARTMENT',
      required: true,
      reasoning: 'Possible ACS presentation',
    };
  }
}

/**
 * Test setup utilities
 */
export class TestSetup {
  /**
   * Setup test application with common pipes
   */
  static setupApp(app: INestApplication) {
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    return app;
  }

  /**
   * Create authorization header
   */
  static createAuthHeader(token: string): { Authorization: string } {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert response success
   */
  static assertSuccess(response: any, expectedStatus: number = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }

  /**
   * Assert response error
   */
  static assertError(response: any, expectedStatus: number) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.error || response.body.message).toBeDefined();
  }

  /**
   * Assert pagination
   */
  static assertPagination(response: any) {
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeDefined();
    expect(response.body.pagination.page).toBeDefined();
  }

  /**
   * Assert audit log entry
   */
  static assertAuditLog(log: any, expectedAction: string) {
    expect(log.action).toBe(expectedAction);
    expect(log.userId).toBeDefined();
    expect(log.timestamp).toBeDefined();
    expect(log.entityType).toBeDefined();
  }
}

/**
 * Mock data factory
 */
export class MockDataFactory {
  /**
   * Create mock user
   */
  static createMockUser(overrides: any = {}) {
    return {
      id: 'user-test-001',
      email: 'test@mediscribe.test',
      passwordHash: 'hashed-password',
      role: 'PHYSICIAN',
      isActive: true,
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create mock patient
   */
  static createMockPatient(overrides: any = {}) {
    return {
      id: 'patient-test-001',
      mrn: 'MRN-001',
      fullName: 'Test Patient',
      dateOfBirth: new Date('1980-01-15'),
      gender: 'M',
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create mock consultation
   */
  static createMockConsultation(overrides: any = {}) {
    return {
      id: 'consul-test-001',
      patientId: 'patient-test-001',
      physicianId: 'user-test-001',
      status: 'SCHEDULED',
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create mock medication order
   */
  static createMockMedicationOrder(overrides: any = {}) {
    return {
      id: 'order-test-001',
      consultationId: 'consul-test-001',
      medicationName: 'Aspirin',
      dose: '325mg',
      status: 'PENDING',
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create mock audit log
   */
  static createMockAuditLog(overrides: any = {}) {
    return {
      id: 'audit-test-001',
      userId: 'user-test-001',
      action: 'CONSULTATION_CREATED',
      entityType: 'Consultation',
      entityId: 'consul-test-001',
      timestamp: new Date(),
      ...overrides,
    };
  }
}
