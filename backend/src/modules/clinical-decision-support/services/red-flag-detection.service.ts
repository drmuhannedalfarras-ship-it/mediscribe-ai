import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';
import { ClinicalExtraction, ExtractionStatus } from '@entities/clinical-extraction.entity';
import { PatientAllergy } from '@entities/patient-allergy.entity';
import { AllergySeverity } from '@entities/patient-allergy.entity';

@Injectable()
export class RedFlagDetectionService {
  private readonly logger = new Logger(RedFlagDetectionService.name);

  // Red flag rules (symptoms/findings that need immediate attention)
  private readonly redFlagRules = {
    critical: [
      {
        flag: 'Chest pain with ECG changes',
        indicators: ['chest pain', 'ecg changes', 'st elevation'],
        description: 'Possible acute myocardial infarction',
        action: 'Immediate cardiology consult, possible catheterization lab',
      },
      {
        flag: 'Respiratory distress with hypoxia',
        indicators: ['dyspnea', 'hypoxia', 'spo2 <90%'],
        description: 'Severe respiratory compromise',
        action: 'Oxygen supplementation, consider ICU admission',
      },
      {
        flag: 'Altered mental status',
        indicators: ['confusion', 'disorientation', 'altered mental status'],
        description: 'Possible stroke, sepsis, or metabolic emergency',
        action: 'Immediate neuro exam, imaging, labs',
      },
      {
        flag: 'Signs of sepsis',
        indicators: ['fever', 'tachycardia', 'hypotension', 'altered mental status'],
        description: 'Systemic infection with end-organ effects',
        action: 'Blood cultures, broad-spectrum antibiotics, ICU',
      },
      {
        flag: 'Severe allergic reaction',
        indicators: ['anaphylaxis', 'stridor', 'angioedema'],
        description: 'Life-threatening allergic reaction',
        action: 'Immediate epinephrine IM, IV access, airway management',
      },
    ],
    high: [
      {
        flag: 'Chest pain with positive troponin',
        indicators: ['chest pain', 'positive troponin', 'elevated troponin'],
        description: 'Myocardial injury confirmed',
        action: 'Hospitalization, cardiac monitoring, aggressive management',
      },
      {
        flag: 'Severe hypertension',
        indicators: ['systolic >180', 'diastolic >120', 'severe headache'],
        description: 'Hypertensive emergency possible',
        action: 'Controlled BP reduction, rule out end-organ damage',
      },
      {
        flag: 'Severe pain',
        indicators: ['severe pain', 'pain 9-10/10', 'uncontrolled pain'],
        description: 'Severe pain requiring immediate relief',
        action: 'Aggressive analgesia, find underlying cause',
      },
      {
        flag: 'Stroke symptoms',
        indicators: ['facial drooping', 'arm weakness', 'speech difficulty', 'onset <4 hours'],
        description: 'Possible acute ischemic stroke (thrombolytic candidate)',
        action: 'Immediate CT, neurology consult, possible thrombolysis',
      },
    ],
    medium: [
      {
        flag: 'Uncontrolled hypertension',
        indicators: ['systolic 160-180', 'diastolic 100-120'],
        description: 'Elevated blood pressure needing urgent control',
        action: 'Medication adjustment, follow-up imaging',
      },
      {
        flag: 'Signs of infection',
        indicators: ['fever', 'elevated wbc', 'localized symptoms'],
        description: 'Possible infection requiring treatment',
        action: 'Consider cultures, imaging, antibiotics',
      },
      {
        flag: 'Hypoglycemia symptoms',
        indicators: ['tremor', 'sweating', 'confusion', 'low glucose'],
        description: 'Low blood glucose',
        action: 'Immediate glucose administration',
      },
    ],
  };

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(ClinicalExtraction)
    private readonly extractionRepository: Repository<ClinicalExtraction>,
    @InjectRepository(PatientAllergy)
    private readonly allergyRepository: Repository<PatientAllergy>,
  ) {}

  /**
   * Detect red flags in a consultation
   */
  async detectRedFlags(
    consultationId: string,
  ): Promise<Array<{
    flag: string;
    severity: 'critical' | 'high' | 'medium';
    description: string;
    action: string;
  }>> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
      relations: ['patient'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Get positive findings
    const extractions = await this.extractionRepository.find({
      where: {
        consultationId,
        status: ExtractionStatus.POSITIVE,
      },
    });

    const findings = extractions.map((e) =>
      e.extractedValue.toLowerCase(),
    );

    // Check for red flags
    const detectedFlags: Array<{
      flag: string;
      severity: 'critical' | 'high' | 'medium';
      description: string;
      action: string;
    }> = [];

    // Check each severity level
    Object.entries(this.redFlagRules).forEach(([severity, rules]: [string, any]) => {
      rules.forEach((rule: any) => {
        const matchedIndicators = rule.indicators.filter((indicator: string) =>
          findings.some((f) =>
            f.includes(indicator.toLowerCase()),
          ),
        );

        if (matchedIndicators.length > 0) {
          detectedFlags.push({
            flag: rule.flag,
            severity: severity as 'critical' | 'high' | 'medium',
            description: rule.description,
            action: rule.action,
          });
        }
      });
    });

    // Check allergy flags
    const allergyFlags = await this.checkAllergyFlags(consultation.patientId);
    detectedFlags.push(...allergyFlags);

    this.logger.log(
      `Red flags detected: ${consultationId} (${detectedFlags.length} flags)`,
    );

    return detectedFlags;
  }

  /**
   * Get critical flags only
   */
  async getCriticalFlags(
    consultationId: string,
  ): Promise<Array<{
    flag: string;
    description: string;
    action: string;
  }>> {
    const allFlags = await this.detectRedFlags(consultationId);
    const critical = allFlags.filter((f) => f.severity === 'critical');

    return critical.map((f) => ({
      flag: f.flag,
      description: f.description,
      action: f.action,
    }));
  }

  /**
   * Check for allergy-related red flags
   */
  private async checkAllergyFlags(
    patientId: string,
  ): Promise<Array<{
    flag: string;
    severity: 'critical' | 'high' | 'medium';
    description: string;
    action: string;
  }>> {
    const allergies = await this.allergyRepository.find({
      where: { patientId, isActive: true },
    });

    const flags: Array<{
      flag: string;
      severity: 'critical' | 'high' | 'medium';
      description: string;
      action: string;
    }> = [];

    // Check for critical allergies
    allergies.forEach((allergy) => {
      if (allergy.severity === AllergySeverity.CRITICAL) {
        flags.push({
          flag: `CRITICAL ALLERGY: ${allergy.allergen}`,
          severity: 'critical',
          description: `Patient has critical allergy to ${allergy.allergen}. Reaction: ${allergy.reaction || 'unknown'}`,
          action: 'Avoid all exposure. Have epinephrine ready if anaphylaxis risk.',
        });
      }
    });

    return flags;
  }

  /**
   * Check medication contraindication
   */
  async checkMedicationContraindication(
    patientId: string,
    proposedMedication: string,
  ): Promise<{
    isContraindicated: boolean;
    reason?: string;
    severity?: 'critical' | 'high' | 'medium';
  }> {
    // Check allergies
    const allergies = await this.allergyRepository.findOne({
      where: {
        patientId,
        allergen: proposedMedication,
        isActive: true,
      },
    });

    if (allergies) {
      return {
        isContraindicated: true,
        reason: `Patient is allergic to ${proposedMedication}. Reaction: ${allergies.reaction}`,
        severity: allergies.severity === AllergySeverity.CRITICAL ? 'critical' : 'high',
      };
    }

    return { isContraindicated: false };
  }

  /**
   * Get severity assessment
   */
  getSeverityAssessment(flags: Array<{ severity: string }>): {
    level: 'critical' | 'high' | 'medium' | 'low';
    urgency: string;
  } {
    const hasCritical = flags.some((f) => f.severity === 'critical');
    const hasHigh = flags.some((f) => f.severity === 'high');

    if (hasCritical) {
      return {
        level: 'critical',
        urgency: 'Immediate intervention required. Consider ICU/ER.',
      };
    }

    if (hasHigh) {
      return {
        level: 'high',
        urgency: 'Urgent evaluation and intervention needed.',
      };
    }

    return {
      level: 'medium',
      urgency: 'Should be addressed in current visit.',
    };
  }

  /**
   * Generate safety alert summary
   */
  generateSafetyAlertSummary(flags: Array<{ flag: string; severity: string }>): string {
    if (flags.length === 0) {
      return 'No safety concerns identified.';
    }

    const criticalCount = flags.filter((f) => f.severity === 'critical').length;
    const highCount = flags.filter((f) => f.severity === 'high').length;

    let summary = '⚠️ SAFETY ALERT: ';

    if (criticalCount > 0) {
      summary += `${criticalCount} critical issue(s) requiring immediate attention. `;
    }

    if (highCount > 0) {
      summary += `${highCount} high-priority issue(s) to address. `;
    }

    summary += `Total alerts: ${flags.length}`;

    return summary;
  }
}
