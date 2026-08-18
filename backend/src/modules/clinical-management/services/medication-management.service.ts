import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';
import { PatientMedication, MedicationStatus } from '@entities/patient-medication.entity';
import { Patient } from '@entities/patient.entity';

@Injectable()
export class MedicationManagementService {
  private readonly logger = new Logger(MedicationManagementService.name);

  // Medication recommendations database
  private readonly medicationRules: Record<
    string,
    Array<{
      medication: string;
      dose: string;
      route: string;
      frequency: string;
      indication: string;
      priority: 'urgent' | 'high' | 'medium';
      category: string;
    }>
  > = {
    'acute coronary syndrome': [
      {
        medication: 'Aspirin',
        dose: '325mg',
        route: 'PO',
        frequency: 'Once',
        indication: 'Antiplatelet therapy',
        priority: 'urgent' as const,
        category: 'Antiplatelet',
      },
      {
        medication: 'Clopidogrel (Plavix)',
        dose: '600mg',
        route: 'PO',
        frequency: 'Once',
        indication: 'P2Y12 inhibitor',
        priority: 'urgent' as const,
        category: 'Antiplatelet',
      },
      {
        medication: 'Metoprolol',
        dose: '25-50mg',
        route: 'PO',
        frequency: 'BID',
        indication: 'Beta-blocker for cardioprotection',
        priority: 'high' as const,
        category: 'Beta-blocker',
      },
      {
        medication: 'Lisinopril',
        dose: '5-10mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'ACE inhibitor for cardioprotection',
        priority: 'high' as const,
        category: 'ACE Inhibitor',
      },
      {
        medication: 'Atorvastatin',
        dose: '80mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'High-intensity statin',
        priority: 'high' as const,
        category: 'Statin',
      },
    ],
    'heart failure': [
      {
        medication: 'Lisinopril',
        dose: '10-20mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'ACE inhibitor',
        priority: 'urgent' as const,
        category: 'ACE Inhibitor',
      },
      {
        medication: 'Carvedilol',
        dose: '3.125-25mg',
        route: 'PO',
        frequency: 'BID',
        indication: 'Beta-blocker',
        priority: 'urgent' as const,
        category: 'Beta-blocker',
      },
      {
        medication: 'Spironolactone',
        dose: '12.5-25mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'Aldosterone antagonist',
        priority: 'high' as const,
        category: 'Diuretic',
      },
      {
        medication: 'Furosemide',
        dose: '20-80mg',
        route: 'PO/IV',
        frequency: 'Daily',
        indication: 'Loop diuretic',
        priority: 'high' as const,
        category: 'Diuretic',
      },
    ],
    'hypertension': [
      {
        medication: 'Lisinopril',
        dose: '10mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'First-line ACE inhibitor',
        priority: 'high' as const,
        category: 'ACE Inhibitor',
      },
      {
        medication: 'Amlodipine',
        dose: '5-10mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'Calcium channel blocker',
        priority: 'high' as const,
        category: 'Calcium Channel Blocker',
      },
      {
        medication: 'Hydrochlorothiazide',
        dose: '25mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'Thiazide diuretic',
        priority: 'medium' as const,
        category: 'Diuretic',
      },
    ],
    'pneumonia': [
      {
        medication: 'Amoxicillin-Clavulanate',
        dose: '875/125mg',
        route: 'PO',
        frequency: 'BID',
        indication: 'Antibiotic for CAP',
        priority: 'urgent' as const,
        category: 'Antibiotic',
      },
      {
        medication: 'Levofloxacin',
        dose: '750mg',
        route: 'PO/IV',
        frequency: 'Daily',
        indication: 'Respiratory fluoroquinolone',
        priority: 'high' as const,
        category: 'Antibiotic',
      },
    ],
    'diabetes': [
      {
        medication: 'Metformin',
        dose: '500-1000mg',
        route: 'PO',
        frequency: 'BID-TID',
        indication: 'First-line diabetes agent',
        priority: 'high' as const,
        category: 'Antidiabetic',
      },
      {
        medication: 'Lisinopril',
        dose: '10mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'Renal protection',
        priority: 'high' as const,
        category: 'ACE Inhibitor',
      },
      {
        medication: 'Atorvastatin',
        dose: '40mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'Lipid management',
        priority: 'medium' as const,
        category: 'Statin',
      },
    ],
  };

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(PatientMedication)
    private readonly medicationRepository: Repository<PatientMedication>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  /**
   * Recommend medications for a consultation
   */
  async recommendMedications(
    consultationId: string,
  ): Promise<Array<{
    medication: string;
    dose: string;
    route: string;
    frequency: string;
    indication: string;
    priority: 'urgent' | 'high' | 'medium';
    category: string;
    contraindications?: string[];
  }>> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
      relations: ['patient'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Get applicable medication rules based on diagnosis/condition
    // In production, would extract from clinical note
    const applicableMeds = this.getApplicableMedications('hypertension');

    if (applicableMeds.length === 0) {
      return [];
    }

    // Check for contraindications
    const withSafetyCheck = await Promise.all(
      applicableMeds.map(async (med) => {
        const contraindications =
          await this.checkMedicationContraindications(
            consultation.patientId,
            med.medication,
          );

        return {
          ...med,
          contraindications,
        };
      }),
    );

    this.logger.log(
      `Medications recommended: ${consultationId} (${withSafetyCheck.length} options)`,
    );

    return withSafetyCheck;
  }

  /**
   * Get applicable medications for a condition
   */
  private getApplicableMedications(
    condition: string,
  ): Array<{
    medication: string;
    dose: string;
    route: string;
    frequency: string;
    indication: string;
    priority: 'urgent' | 'high' | 'medium';
    category: string;
  }> {
    const rules = this.medicationRules[condition.toLowerCase()] || [];
    return rules;
  }

  /**
   * Check medication contraindications for patient
   */
  private async checkMedicationContraindications(
    _patientId: string,
    medicationName: string,
  ): Promise<string[]> {
    // In production, would check against:
    // - Allergies
    // - Current medications
    // - Comorbidities
    // - Renal/hepatic function
    // - Pregnancy status
    // - Drug interactions

    const contraindications: string[] = [];

    // Example checks
    if (medicationName.toLowerCase().includes('lisinopril')) {
      contraindications.push('Monitor potassium levels');
      contraindications.push('Monitor renal function');
    }

    if (medicationName.toLowerCase().includes('metformin')) {
      contraindications.push('Contraindicated in eGFR <30');
    }

    return contraindications;
  }

  /**
   * Get medication recommendations by category
   */
  async getMedicationsByCategory(category: string): Promise<Array<{
    medication: string;
    dose: string;
    frequency: string;
    indication: string;
  }>> {
    const allMeds = Object.values(this.medicationRules).flat();
    return allMeds
      .filter((med) => med.category === category)
      .map((med) => ({
        medication: med.medication,
        dose: med.dose,
        frequency: med.frequency,
        indication: med.indication,
      }));
  }

  /**
   * Get urgent medications only
   */
  async getUrgentMedications(consultationId: string): Promise<any[]> {
    const medications = await this.recommendMedications(consultationId);
    return medications.filter((m) => m.priority === 'urgent');
  }

  /**
   * Create medication order
   */
  async createMedicationOrder(
    patientId: string,
    _consultationId: string,
    medicationData: {
      medicationName: string;
      dose: string;
      route: string;
      frequency: string;
      duration?: string;
      indication: string;
    },
  ): Promise<PatientMedication> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    // Check contraindications before creating order
    const contraindications =
      await this.checkMedicationContraindications(
        patientId,
        medicationData.medicationName,
      );

    if (contraindications.length > 0) {
      this.logger.warn(
        `Medication order created with warnings: ${medicationData.medicationName}`,
      );
    }

    const medication = this.medicationRepository.create({
      patient,
      medicationName: medicationData.medicationName,
      dose: medicationData.dose,
      route: medicationData.route,
      frequency: medicationData.frequency,
      notes: medicationData.duration ? `Duration: ${medicationData.duration}` : undefined,
      indication: medicationData.indication,
      startDate: new Date(),
      status: MedicationStatus.ACTIVE,
    });

    await this.medicationRepository.save(medication);

    this.logger.log(
      `Medication order created: ${patientId} - ${medicationData.medicationName}`,
    );

    return medication;
  }

  /**
   * Get medication alternatives
   */
  getAlternativeMedications(medicationName: string): Array<{
    medication: string;
    dose: string;
    indication: string;
    pros: string[];
    cons: string[];
  }> {
    const alternatives: {
      [key: string]: Array<{
        medication: string;
        dose: string;
        indication: string;
        pros: string[];
        cons: string[];
      }>;
    } = {
      Lisinopril: [
        {
          medication: 'Losartan (ARB alternative)',
          dose: '50mg',
          indication: 'ACE inhibitor intolerance',
          pros: ['No dry cough', 'Effective BP control'],
          cons: ['More expensive', 'Less cardiac benefit'],
        },
      ],
      Aspirin: [
        {
          medication: 'Clopidogrel',
          dose: '75mg',
          indication: 'Aspirin allergy',
          pros: ['Alternative antiplatelet', 'Similar efficacy'],
          cons: ['Cost', 'Requires loading dose'],
        },
      ],
    };

    return alternatives[medicationName] || [];
  }

  /**
   * Get medication dosing for renal function
   */
  getDosageAdjustmentForRenalFunction(
    _medication: string,
    eGFR: number,
  ): {
    dosingAdjustment: string;
    recommendation: string;
  } {
    // Simplified renal dosing
    if (eGFR > 60) {
      return {
        dosingAdjustment: 'No adjustment',
        recommendation: 'Use normal dose',
      };
    } else if (eGFR >= 30 && eGFR <= 60) {
      return {
        dosingAdjustment: '50% reduction',
        recommendation: 'Reduce dose or increase interval',
      };
    } else {
      return {
        dosingAdjustment: 'Contraindicated or minimal dose',
        recommendation: 'Avoid or use with extreme caution',
      };
    }
  }

  /**
   * Check if medication safe in pregnancy
   */
  isMedicationSafeInPregnancy(medication: string): {
    safe: boolean;
    category: string;
    recommendation: string;
  } {
    // FDA Pregnancy Categories
    const pregnancyCategories: {
      [key: string]: {
        category: string;
        safe: boolean;
        recommendation: string;
      };
    } = {
      Aspirin: {
        category: 'C/D',
        safe: false,
        recommendation: 'Avoid, especially in 3rd trimester',
      },
      Lisinopril: {
        category: 'D',
        safe: false,
        recommendation: 'Teratogenic, contraindicated',
      },
      Metformin: {
        category: 'B',
        safe: true,
        recommendation: 'Generally safe, preferred agent',
      },
      Penicillin: {
        category: 'B',
        safe: true,
        recommendation: 'Safe, preferred antibiotic',
      },
    };

    return (
      pregnancyCategories[medication] || {
        category: 'Unknown',
        safe: false,
        recommendation: 'Consult pharmacist or perinatologist',
      }
    );
  }
}
