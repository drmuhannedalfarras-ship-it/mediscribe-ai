import { DataSource, DataSourceOptions } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import {
  User,
  UserStatus,
  Role,
  Permission,
  UserRole,
  Patient,
  Gender,
  PatientStatus,
  PatientAllergy,
  AllergySeverity,
  PatientMedication,
  PatientCondition,
  ConditionStatus,
  VitalSigns,
  Consultation,
  ConsultationStatus,
  ConsultationConsent,
  ConsentStatus,
} from '@entities/index';
import { getDatabaseConfig } from '@config/database.config';

async function seed() {
  const dataSource = new DataSource(getDatabaseConfig() as DataSourceOptions);
  await dataSource.initialize();

  try {
    console.log('🌱 Starting database seeding...');

    // ===== STEP 1: Create Roles =====
    console.log('Creating roles...');
    const adminRole = dataSource.getRepository(Role).create({
      id: uuid(),
      name: 'SUPER_ADMIN',
      description: 'System Administrator',
      isSystem: true,
    });
    const physicianRole = dataSource.getRepository(Role).create({
      id: uuid(),
      name: 'PHYSICIAN',
      description: 'Physician User',
      isSystem: true,
    });
    const nurseRole = dataSource.getRepository(Role).create({
      id: uuid(),
      name: 'NURSE',
      description: 'Nurse User',
      isSystem: true,
    });
    const clinicalAdminRole = dataSource.getRepository(Role).create({
      id: uuid(),
      name: 'CLINICAL_ADMIN',
      description: 'Clinical Administrator',
      isSystem: true,
    });

    await dataSource.getRepository(Role).save([
      adminRole,
      physicianRole,
      nurseRole,
      clinicalAdminRole,
    ]);

    // ===== STEP 2: Create Permissions =====
    console.log('Creating permissions...');
    const permissions = [
      'user.create',
      'user.read',
      'user.update',
      'user.delete',
      'patient.create',
      'patient.read',
      'patient.update',
      'patient.delete',
      'consultation.create',
      'consultation.read',
      'consultation.update',
      'consultation.delete',
      'audit.read',
    ].map((name) =>
      dataSource.getRepository(Permission).create({
        id: uuid(),
        name,
        description: name,
      }),
    );

    await dataSource.getRepository(Permission).save(permissions);

    // ===== STEP 3: Create Users =====
    console.log('Creating users...');
    const adminUser = dataSource.getRepository(User).create({
      id: uuid(),
      email: 'admin@mediscribe.local',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: await bcrypt.hash('admin123', 10),
      status: UserStatus.ACTIVE,
      department: 'Administration',
    });

    const physician1 = dataSource.getRepository(User).create({
      id: uuid(),
      email: 'dr.smith@mediscribe.local',
      firstName: 'John',
      lastName: 'Smith',
      passwordHash: await bcrypt.hash('doctor123', 10),
      status: UserStatus.ACTIVE,
      specialization: 'Internal Medicine',
      licenseNumber: 'MD-123456',
      department: 'Internal Medicine',
      employeeId: 'PHY-001',
    });

    const physician2 = dataSource.getRepository(User).create({
      id: uuid(),
      email: 'dr.johnson@mediscribe.local',
      firstName: 'Sarah',
      lastName: 'Johnson',
      passwordHash: await bcrypt.hash('doctor123', 10),
      status: UserStatus.ACTIVE,
      specialization: 'Pediatrics',
      licenseNumber: 'MD-123457',
      department: 'Pediatrics',
      employeeId: 'PHY-002',
    });

    const nurse = dataSource.getRepository(User).create({
      id: uuid(),
      email: 'nurse.jane@mediscribe.local',
      firstName: 'Jane',
      lastName: 'Doe',
      passwordHash: await bcrypt.hash('nurse123', 10),
      status: UserStatus.ACTIVE,
      department: 'Nursing',
      employeeId: 'NURSE-001',
    });

    const users = [adminUser, physician1, physician2, nurse];
    await dataSource.getRepository(User).save(users);

    // ===== STEP 4: Assign Roles to Users =====
    console.log('Assigning roles...');
    const userRoles = [
      dataSource.getRepository(UserRole).create({
        id: uuid(),
        user: adminUser,
        role: adminRole,
      }),
      dataSource.getRepository(UserRole).create({
        id: uuid(),
        user: physician1,
        role: physicianRole,
      }),
      dataSource.getRepository(UserRole).create({
        id: uuid(),
        user: physician2,
        role: physicianRole,
      }),
      dataSource.getRepository(UserRole).create({
        id: uuid(),
        user: nurse,
        role: nurseRole,
      }),
    ];

    await dataSource.getRepository(UserRole).save(userRoles);

    // ===== STEP 5: Create Patients =====
    console.log('Creating patients...');
    const patients = [
      {
        patientId: '2024001',
        mrn: '2024001',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: new Date('1965-03-15'),
        gender: Gender.MALE,
        email: 'john.smith@email.com',
        phoneNumber: '+1-555-0101',
        city: 'New York',
        country: 'USA',
      },
      {
        patientId: '2024002',
        mrn: '2024002',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: new Date('1978-07-22'),
        gender: Gender.FEMALE,
        email: 'jane.doe@email.com',
        phoneNumber: '+1-555-0102',
        city: 'Boston',
        country: 'USA',
      },
      {
        patientId: '2024003',
        mrn: '2024003',
        firstName: 'Robert',
        lastName: 'Johnson',
        dateOfBirth: new Date('1955-11-08'),
        gender: Gender.MALE,
        email: 'robert.j@email.com',
        phoneNumber: '+1-555-0103',
        city: 'Chicago',
        country: 'USA',
      },
      {
        patientId: '2024004',
        mrn: '2024004',
        firstName: 'Maria',
        lastName: 'Garcia',
        dateOfBirth: new Date('1982-05-30'),
        gender: Gender.FEMALE,
        email: 'maria.garcia@email.com',
        phoneNumber: '+1-555-0104',
        city: 'Los Angeles',
        country: 'USA',
      },
      {
        patientId: '2024005',
        mrn: '2024005',
        firstName: 'Michael',
        lastName: 'Brown',
        dateOfBirth: new Date('1990-01-12'),
        gender: Gender.MALE,
        email: 'michael.brown@email.com',
        phoneNumber: '+1-555-0105',
        city: 'Houston',
        country: 'USA',
      },
    ].map((p) =>
      dataSource.getRepository(Patient).create({
        id: uuid(),
        status: PatientStatus.ACTIVE,
        ...p,
      }),
    );

    await dataSource.getRepository(Patient).save(patients);

    // ===== STEP 6: Create Allergies =====
    console.log('Creating allergies...');
    const allergies = [
      {
        patient: patients[0],
        allergen: 'Penicillin',
        severity: AllergySeverity.SEVERE,
        reaction: 'Anaphylaxis',
      },
      {
        patient: patients[0],
        allergen: 'Latex',
        severity: AllergySeverity.MODERATE,
        reaction: 'Skin rash',
      },
      {
        patient: patients[1],
        allergen: 'Aspirin',
        severity: AllergySeverity.MILD,
        reaction: 'GI upset',
      },
      {
        patient: patients[2],
        allergen: 'Shellfish',
        severity: AllergySeverity.MODERATE,
        reaction: 'Oral itching and swelling',
      },
    ].map((a) =>
      dataSource.getRepository(PatientAllergy).create({
        id: uuid(),
        ...a,
      }),
    );

    await dataSource.getRepository(PatientAllergy).save(allergies);

    // ===== STEP 7: Create Medications =====
    console.log('Creating medications...');
    const medications = [
      {
        patient: patients[0],
        medicationName: 'Metoprolol',
        dose: '50mg',
        frequency: 'Once daily',
        route: 'Oral',
        indication: 'Hypertension',
      },
      {
        patient: patients[0],
        medicationName: 'Lisinopril',
        dose: '10mg',
        frequency: 'Once daily',
        route: 'Oral',
        indication: 'Hypertension',
      },
      {
        patient: patients[1],
        medicationName: 'Metformin',
        dose: '500mg',
        frequency: 'Twice daily',
        route: 'Oral',
        indication: 'Type 2 Diabetes',
      },
      {
        patient: patients[2],
        medicationName: 'Levothyroxine',
        dose: '75mcg',
        frequency: 'Once daily',
        route: 'Oral',
        indication: 'Hypothyroidism',
      },
    ].map((m) =>
      dataSource.getRepository(PatientMedication).create({
        id: uuid(),
        ...m,
      }),
    );

    await dataSource.getRepository(PatientMedication).save(medications);

    // ===== STEP 8: Create Conditions =====
    console.log('Creating conditions...');
    const conditions = [
      {
        patient: patients[0],
        conditionName: 'Hypertension',
        icdCode: 'I10',
        status: ConditionStatus.ACTIVE,
      },
      {
        patient: patients[0],
        conditionName: 'Type 2 Diabetes Mellitus',
        icdCode: 'E11',
        status: ConditionStatus.ACTIVE,
      },
      {
        patient: patients[1],
        conditionName: 'Asthma',
        icdCode: 'J45',
        status: ConditionStatus.ACTIVE,
      },
      {
        patient: patients[2],
        conditionName: 'Hypothyroidism',
        icdCode: 'E03',
        status: ConditionStatus.ACTIVE,
      },
    ].map((c) =>
      dataSource.getRepository(PatientCondition).create({
        id: uuid(),
        ...c,
      }),
    );

    await dataSource.getRepository(PatientCondition).save(conditions);

    // ===== STEP 9: Create Vital Signs =====
    console.log('Creating vital signs...');
    const vitalSigns = [
      {
        patient: patients[0],
        systolicBP: 130,
        diastolicBP: 85,
        pulse: 72,
        temperature: 36.8,
        respiratoryRate: 16,
        height: 180,
        weight: 85,
        bmi: 26.2,
      },
      {
        patient: patients[1],
        systolicBP: 120,
        diastolicBP: 80,
        pulse: 68,
        temperature: 36.9,
        respiratoryRate: 15,
        height: 168,
        weight: 62,
        bmi: 21.97,
      },
      {
        patient: patients[2],
        systolicBP: 135,
        diastolicBP: 88,
        pulse: 75,
        temperature: 36.7,
        respiratoryRate: 17,
        height: 175,
        weight: 88,
        bmi: 28.73,
      },
    ].map((v) =>
      dataSource.getRepository(VitalSigns).create({
        id: uuid(),
        measuredAt: new Date(),
        ...v,
      }),
    );

    await dataSource.getRepository(VitalSigns).save(vitalSigns);

    // ===== STEP 10: Create Consultations =====
    console.log('Creating consultations...');
    const consultations = [
      {
        patient: patients[0],
        physician: physician1,
        reasonForVisit: 'Hypertension follow-up',
        status: ConsultationStatus.FINALIZED,
        department: 'Internal Medicine',
        specialty: 'General Internal Medicine',
      },
      {
        patient: patients[1],
        physician: physician1,
        reasonForVisit: 'Diabetes management',
        status: ConsultationStatus.FINALIZED,
        department: 'Internal Medicine',
        specialty: 'Endocrinology',
      },
      {
        patient: patients[2],
        physician: physician2,
        reasonForVisit: 'Pediatric checkup',
        status: ConsultationStatus.FINALIZED,
        department: 'Pediatrics',
        specialty: 'General Pediatrics',
      },
      {
        patient: patients[3],
        physician: physician1,
        reasonForVisit: 'Annual physical examination',
        status: ConsultationStatus.SCHEDULED,
        department: 'Internal Medicine',
        specialty: 'General Internal Medicine',
      },
    ].map((c) =>
      dataSource.getRepository(Consultation).create({
        id: uuid(),
        ...c,
      }),
    );

    await dataSource.getRepository(Consultation).save(consultations);

    // ===== STEP 11: Create Consents =====
    console.log('Creating consents...');
    const consents = [
      {
        consultation: consultations[0],
        status: ConsentStatus.GIVEN,
        consentVersion: '1.0',
        consentGivenAt: new Date(),
      },
      {
        consultation: consultations[1],
        status: ConsentStatus.GIVEN,
        consentVersion: '1.0',
        consentGivenAt: new Date(),
      },
    ].map((c) =>
      dataSource.getRepository(ConsultationConsent).create({
        id: uuid(),
        ...c,
      }),
    );

    await dataSource.getRepository(ConsultationConsent).save(consents);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📝 Demo Credentials:');
    console.log('   Admin:    admin@mediscribe.local / admin123');
    console.log('   Physician: dr.smith@mediscribe.local / doctor123');
    console.log('   Physician: dr.johnson@mediscribe.local / doctor123');
    console.log('   Nurse:    nurse.jane@mediscribe.local / nurse123');
    console.log('\n📊 Created:');
    console.log(`   - ${users.length} users`);
    console.log(`   - ${patients.length} patients`);
    console.log(`   - ${medications.length} medications`);
    console.log(`   - ${conditions.length} conditions`);
    console.log(`   - ${allergies.length} allergies`);
    console.log(`   - ${vitalSigns.length} vital sign records`);
    console.log(`   - ${consultations.length} consultations`);
  } catch (error: any) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await dataSource.destroy();
  }
}

seed();
