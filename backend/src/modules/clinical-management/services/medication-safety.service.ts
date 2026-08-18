import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '@entities/patient.entity';
import { PatientAllergy } from '@entities/patient-allergy.entity';
import { PatientMedication, MedicationStatus } from '@entities/patient-medication.entity';

@Injectable()
export class MedicationSafetyService {
  private readonly logger = new Logger(MedicationSafetyService.name);

  // Drug-drug interaction database
  private readonly interactions: Record<
    string,
    { severity: 'critical' | 'high' | 'moderate'; description: string; action: string }
  > = {
    'warfarin-aspirin': {
      severity: 'moderate' as const,
      description: 'Increased bleeding risk',
      action: 'Monitor INR closely; consider alternative',
    },
    'lisinopril-potassium': {
      severity: 'moderate' as const,
      description: 'Hyperkalemia risk',
      action: 'Monitor K+ levels; adjust as needed',
    },
    'metformin-contrast': {
      severity: 'high' as const,
      description: 'Lactic acidosis risk',
      action: 'Hold metformin 48h before contrast, resume after 48h if normal renal function',
    },
    'simvastatin-clarithromycin': {
      severity: 'moderate' as const,
      description: 'Statin toxicity risk',
      action: 'Use alternative antibiotic or reduce statin dose',
    },
  };

  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(PatientAllergy)
    private readonly allergyRepository: Repository<PatientAllergy>,
    @InjectRepository(PatientMedication)
    private readonly medicationRepository: Repository<PatientMedication>,
  ) {}

  /**
   * Perform comprehensive safety check
   */
  async performComprehensiveCheck(
    patientId: string,
  ): Promise<{
    contraindications: Array<{
      medication: string;
      contraindication: string;
      severity: string;
      action: string;
    }>;
    interactions: Array<{
      drug1: string;
      drug2: string;
      severity: string;
      description: string;
      action: string;
    }>;
    allergies: Array<{
      allergen: string;
      severity: string;
      reaction: string;
    }>;
    recommendations: string[];
  }> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    // Get allergies
    const allergies = await this.allergyRepository.find({
      where: { patientId, isActive: true },
    });

    // Get current medications
    const medications = await this.medicationRepository.find({
      where: { patientId, status: MedicationStatus.ACTIVE },
    });

    // Check for interactions
    const interactions = this.checkDrugInteractions(
      medications.map((m) => m.medicationName),
    );

    // Check for contraindications
    const contraindications = this.checkContraindications(
      medications.map((m) => m.medicationName),
      patient,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      interactions,
      contraindications,
      allergies,
    );

    this.logger.log(
      `Safety check performed: ${patientId} (${interactions.length} interactions, ${contraindications.length} contraindications)`,
    );

    return {
      contraindications,
      interactions,
      allergies: allergies.map((a) => ({
        allergen: a.allergen,
        severity: a.severity,
        reaction: a.reaction || 'Unknown',
      })),
      recommendations,
    };
  }

  /**
   * Check drug-drug interactions
   */
  private checkDrugInteractions(medications: string[]): Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
    action: string;
  }> {
    const interactions: Array<{
      drug1: string;
      drug2: string;
      severity: string;
      description: string;
      action: string;
    }> = [];

    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const drug1 = medications[i].toLowerCase();
        const drug2 = medications[j].toLowerCase();
        const key = `${drug1}-${drug2}`;

        if (this.interactions[key]) {
          const interaction = this.interactions[key];
          interactions.push({
            drug1: medications[i],
            drug2: medications[j],
            severity: interaction.severity,
            description: interaction.description,
            action: interaction.action,
          });
        }

        // Check reverse order
        const reverseKey = `${drug2}-${drug1}`;
        if (this.interactions[reverseKey]) {
          const interaction = this.interactions[reverseKey];
          interactions.push({
            drug1: medications[i],
            drug2: medications[j],
            severity: interaction.severity,
            description: interaction.description,
            action: interaction.action,
          });
        }
      }
    }

    return interactions;
  }

  /**
   * Check contraindications with patient factors
   */
  private checkContraindications(
    medications: string[],
    patient: any,
  ): Array<{
    medication: string;
    contraindication: string;
    severity: string;
    action: string;
  }> {
    const contraindications: Array<{
      medication: string;
      contraindication: string;
      severity: string;
      action: string;
    }> = [];

    medications.forEach((med) => {
      // ACE inhibitor checks
      if (med.toLowerCase().includes('pril') || med.toLowerCase().includes('ace')) {
        if (patient.pregnant) {
          contraindications.push({
            medication: med,
            contraindication: 'Pregnancy',
            severity: 'critical',
            action: 'Avoid in pregnancy, especially 2nd/3rd trimester',
          });
        }
      }

      // Metformin checks
      if (med.toLowerCase().includes('metformin')) {
        if (patient.eGFR && patient.eGFR < 30) {
          contraindications.push({
            medication: med,
            contraindication: 'Severe renal impairment',
            severity: 'high',
            action: 'Contraindicated with eGFR <30',
          });
        }
      }

      // NSAID checks
      if (
        med.toLowerCase().includes('ibuprofen') ||
        med.toLowerCase().includes('naproxen')
      ) {
        if (patient.heartFailure) {
          contraindications.push({
            medication: med,
            contraindication: 'Heart failure',
            severity: 'moderate',
            action: 'May worsen fluid retention',
          });
        }
      }
    });

    return contraindications;
  }

  /**
   * Generate safety recommendations
   */
  private generateRecommendations(
    interactions: any[],
    contraindications: any[],
    allergies: any[],
  ): string[] {
    const recommendations: string[] = [];

    if (interactions.length > 0) {
      const criticalInteractions = interactions.filter(
        (i) => i.severity === 'critical',
      );
      if (criticalInteractions.length > 0) {
        recommendations.push(
          `CRITICAL: ${criticalInteractions.length} potentially dangerous drug interaction(s) detected. Review immediately.`,
        );
      }

      const moderateInteractions = interactions.filter(
        (i) => i.severity === 'moderate',
      );
      if (moderateInteractions.length > 0) {
        recommendations.push(
          `Monitor: ${moderateInteractions.length} moderate drug interaction(s) present. Monitor patient.`,
        );
      }
    }

    if (contraindications.length > 0) {
      const criticalContraindications = contraindications.filter(
        (c) => c.severity === 'critical',
      );
      if (criticalContraindications.length > 0) {
        recommendations.push(
          `CRITICAL: ${criticalContraindications.length} contraindication(s) exist. Consider alternative therapy.`,
        );
      }
    }

    if (allergies.length > 0) {
      recommendations.push(
        `ALERT: Patient has ${allergies.length} documented allergy(ies). Verify all medications are safe.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('No major safety concerns identified.');
    }

    return recommendations;
  }

  /**
   * Check specific medication for allergies
   */
  async checkMedicationForAllergy(
    patientId: string,
    medication: string,
  ): Promise<{
    isSafe: boolean;
    allergen?: string;
    severity?: string;
    reaction?: string;
    recommendation: string;
  }> {
    const allergies = await this.allergyRepository.findOne({
      where: {
        patientId,
        allergen: medication,
        isActive: true,
      },
    });

    if (allergies) {
      return {
        isSafe: false,
        allergen: allergies.allergen,
        severity: allergies.severity,
        reaction: allergies.reaction,
        recommendation: 'Do not use. Select alternative medication.',
      };
    }

    return {
      isSafe: true,
      recommendation: 'No known allergies to this medication.',
    };
  }

  /**
   * Suggest safe alternatives
   */
  suggestSafeAlternatives(medication: string): Array<{
    alternative: string;
    rationale: string;
    advantages: string[];
    disadvantages: string[];
  }> {
    const alternatives: {
      [key: string]: Array<{
        alternative: string;
        rationale: string;
        advantages: string[];
        disadvantages: string[];
      }>;
    } = {
      Aspirin: [
        {
          alternative: 'Clopidogrel',
          rationale: 'Aspirin allergy/intolerance',
          advantages: ['Similar antiplatelet effect', 'Different mechanism'],
          disadvantages: ['More expensive', 'Requires loading dose'],
        },
      ],
      Lisinopril: [
        {
          alternative: 'Losartan',
          rationale: 'ACE inhibitor intolerance (e.g., cough)',
          advantages: ['No dry cough', 'Similar BP control'],
          disadvantages: ['Less cardiac benefit', 'More expensive'],
        },
      ],
    };

    return alternatives[medication] || [];
  }

  /**
   * Get medication safety education
   */
  getMedicationSafetyEducation(medication: string): {
    takingInstructions: string[];
    sideEffects: string[];
    warningSignsToReport: string[];
    storage: string[];
  } {
    const education: {
      [key: string]: {
        takingInstructions: string[];
        sideEffects: string[];
        warningSignsToReport: string[];
        storage: string[];
      };
    } = {
      Metformin: {
        takingInstructions: [
          'Take with food to reduce GI upset',
          'Take consistently to maintain glucose control',
          'Do not crush extended-release tablets',
        ],
        sideEffects: [
          'Gastrointestinal upset',
          'Metallic taste',
          'Vitamin B12 deficiency (long-term)',
        ],
        warningSignsToReport: [
          'Severe abdominal pain',
          'Shortness of breath',
          'Rapid/irregular heartbeat',
        ],
        storage: [
          'Room temperature',
          'Away from moisture',
          'Keep in original container',
        ],
      },
      Lisinopril: {
        takingInstructions: [
          'Take at same time daily',
          'Can be taken with or without food',
          'May require dose adjustment over time',
        ],
        sideEffects: [
          'Dry cough (common)',
          'Dizziness',
          'Fatigue',
          'Hyperkalemia risk',
        ],
        warningSignsToReport: [
          'Severe dizziness/syncope',
          'Swelling of face/throat',
          'Chest pain',
          'Rapid heartbeat',
        ],
        storage: [
          'Room temperature',
          'Away from heat/light',
          'Protect from moisture',
        ],
      },
    };

    return (
      education[medication] || {
        takingInstructions: [],
        sideEffects: [],
        warningSignsToReport: [],
        storage: [],
      }
    );
  }
}
