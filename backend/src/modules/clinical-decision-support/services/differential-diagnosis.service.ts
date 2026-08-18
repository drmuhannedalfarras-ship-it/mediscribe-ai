import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';
import { ClinicalExtraction, ExtractionStatus } from '@entities/clinical-extraction.entity';

@Injectable()
export class DifferentialDiagnosisService {
  private readonly logger = new Logger(DifferentialDiagnosisService.name);

  // Common differential diagnosis rules (simplified for Phase 2)
  private readonly diagnosisRules = {
    'chest pain': [
      {
        diagnosis: 'Acute Coronary Syndrome',
        icdCode: 'I24.9',
        baseScore: 0.8,
        factors: {
          positive: ['chest pain', 'diaphoresis', 'dyspnea', 'male', 'age > 50'],
          negative: ['musculoskeletal', 'normal ecg'],
        },
      },
      {
        diagnosis: 'Pulmonary Embolism',
        icdCode: 'I26.9',
        baseScore: 0.6,
        factors: {
          positive: ['dyspnea', 'chest pain', 'tachycardia', 'recent surgery'],
          negative: ['normal d-dimer'],
        },
      },
      {
        diagnosis: 'Gastroesophageal Reflux',
        icdCode: 'K21',
        baseScore: 0.5,
        factors: {
          positive: ['burning', 'epigastric', 'postprandial', 'relieved by antacid'],
          negative: ['diaphoresis', 'ekg changes'],
        },
      },
      {
        diagnosis: 'Musculoskeletal Pain',
        icdCode: 'M79.9',
        baseScore: 0.4,
        factors: {
          positive: ['reproducible', 'positional', 'musculoskeletal exam'],
          negative: ['dyspnea', 'diaphoresis'],
        },
      },
    ],
    'dyspnea': [
      {
        diagnosis: 'Acute Heart Failure',
        icdCode: 'I50.9',
        baseScore: 0.75,
        factors: {
          positive: ['orthopnea', 'edema', 'elevated jvp', 'crackles'],
          negative: ['normal bmi', 'clear lungs'],
        },
      },
      {
        diagnosis: 'Pneumonia',
        icdCode: 'J18.9',
        baseScore: 0.7,
        factors: {
          positive: ['fever', 'cough', 'consolidation', 'elevated wbc'],
          negative: ['normal temp', 'clear lungs'],
        },
      },
      {
        diagnosis: 'COPD Exacerbation',
        icdCode: 'J44.9',
        baseScore: 0.65,
        factors: {
          positive: ['smoking history', 'increased sputum', 'wheezing'],
          negative: ['first presentation', 'no smoking history'],
        },
      },
    ],
    'fever': [
      {
        diagnosis: 'Infection (Bacterial)',
        icdCode: 'A49.9',
        baseScore: 0.7,
        factors: {
          positive: ['elevated wbc', 'fever', 'focal symptoms'],
          negative: ['normal examination'],
        },
      },
      {
        diagnosis: 'Viral Infection',
        icdCode: 'B34.9',
        baseScore: 0.6,
        factors: {
          positive: ['viral prodrome', 'normal wbc', 'self-limited'],
          negative: ['high fever', 'sepsis signs'],
        },
      },
    ],
  };

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(ClinicalExtraction)
    private readonly extractionRepository: Repository<ClinicalExtraction>,
  ) {}

  /**
   * Generate differential diagnosis for a consultation
   */
  async generateDifferentialDiagnosis(
    consultationId: string,
  ): Promise<Array<{
    diagnosis: string;
    icdCode?: string;
    probability: number;
    reasoning: string;
    evidence: string[];
  }>> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Get positive clinical findings
    const extractions = await this.extractionRepository.find({
      where: {
        consultationId,
        status: ExtractionStatus.POSITIVE,
      },
    });

    if (extractions.length === 0) {
      return this.getDefaultDifferentials();
    }

    // Extract chief complaint and key findings
    const findings = extractions.map((e) =>
      e.extractedValue.toLowerCase(),
    );

    // Get relevant rules
    const applicableRules = this.getApplicableRules(findings);

    // Score each differential
    const differentials = this.scoreDifferentials(
      applicableRules,
      findings,
      extractions,
    );

    // Sort by probability descending
    differentials.sort((a, b) => b.probability - a.probability);

    this.logger.log(
      `Differential diagnosis generated: ${consultationId} (${differentials.length} options)`,
    );

    return differentials;
  }

  /**
   * Score each differential based on findings
   */
  private scoreDifferentials(
    rules: any[],
    findings: string[],
    _extractions: ClinicalExtraction[],
  ): Array<{
    diagnosis: string;
    icdCode?: string;
    probability: number;
    reasoning: string;
    evidence: string[];
  }> {
    const scored = rules.map((rule) => {
      let score = rule.baseScore;
      const evidence: string[] = [];

      // Check positive factors
      if (rule.factors.positive) {
        const matchedPositive = rule.factors.positive.filter((factor: string) =>
          findings.some((f) => f.includes(factor.toLowerCase())),
        );
        score += matchedPositive.length * 0.1;
        evidence.push(...matchedPositive);
      }

      // Check negative factors
      if (rule.factors.negative) {
        const matchedNegative = rule.factors.negative.filter((factor: string) =>
          findings.some((f) => f.includes(factor.toLowerCase())),
        );
        score -= matchedNegative.length * 0.15;
      }

      // Clamp score to 0-1
      const probability = Math.max(0, Math.min(1, score));

      return {
        diagnosis: rule.diagnosis,
        icdCode: rule.icdCode,
        probability,
        reasoning: this.generateReasoning(
          rule.diagnosis,
          evidence,
          probability,
        ),
        evidence,
      };
    });

    return scored;
  }

  /**
   * Get applicable diagnostic rules based on findings
   */
  private getApplicableRules(findings: string[]): any[] {
    const applicableRules: any[] = [];

    // Check each finding against rules
    Object.entries(this.diagnosisRules).forEach(([condition, rules]: [string, any]) => {
      if (findings.some((f) => f.includes(condition.toLowerCase()))) {
        applicableRules.push(...rules);
      }
    });

    // If no specific rules match, return common differentials for top finding
    if (applicableRules.length === 0 && findings.length > 0) {
      return this.getDefaultDifferentials();
    }

    return applicableRules;
  }

  /**
   * Generate reasoning text
   */
  private generateReasoning(
    diagnosis: string,
    evidence: string[],
    probability: number,
  ): string {
    const percentile = Math.round(probability * 100);

    if (evidence.length === 0) {
      return `${diagnosis} is in the differential based on prevalence (${percentile}% likelihood).`;
    }

    return `${diagnosis} is likely given findings of ${evidence.join(', ')} (${percentile}% probability).`;
  }

  /**
   * Default differentials when no specific findings
   */
  private getDefaultDifferentials(): Array<{
    diagnosis: string;
    icdCode?: string;
    probability: number;
    reasoning: string;
    evidence: string[];
  }> {
    return [
      {
        diagnosis: 'Insufficient clinical information',
        icdCode: undefined,
        probability: 1.0,
        reasoning: 'Additional history and examination needed to establish diagnosis.',
        evidence: [],
      },
    ];
  }

  /**
   * Get differential for specific chief complaint
   */
  async getDifferentialForChiefComplaint(
    chiefComplaint: string,
  ): Promise<Array<{
    diagnosis: string;
    icdCode?: string;
    probability: number;
    reasoning: string;
    evidence: string[];
  }>> {
    const complaint = chiefComplaint.toLowerCase();
    const applicableRules = Object.values(this.diagnosisRules)
      .flat()
      .filter((rule: any) =>
        rule.factors.positive.some((f: string) =>
          complaint.includes(f.toLowerCase()),
        ),
      );

    if (applicableRules.length === 0) {
      return this.getDefaultDifferentials();
    }

    return this.scoreDifferentials(applicableRules, [complaint], []);
  }

  /**
   * Validate differential against patient factors
   */
  async validateDifferential(
    diagnosis: string,
    patientAge: number,
    patientRiskFactors: string[],
  ): Promise<{
    diagnosis: string;
    adjustedProbability: number;
    riskAdjustment: number;
    reasoning: string;
  }> {
    // Age adjustments (simplified)
    let ageAdjustment = 1.0;

    if (diagnosis.toLowerCase().includes('acute coronary')) {
      if (patientAge > 65) {
        ageAdjustment = 1.3;
      } else if (patientAge < 40) {
        ageAdjustment = 0.5;
      }
    }

    // Risk factor adjustment
    let riskAdjustment = 1.0;
    if (patientRiskFactors.includes('smoking')) {
      riskAdjustment *= 1.2;
    }
    if (patientRiskFactors.includes('diabetes')) {
      riskAdjustment *= 1.15;
    }
    if (patientRiskFactors.includes('hypertension')) {
      riskAdjustment *= 1.1;
    }

    const adjustedProbability = Math.min(
      1.0,
      ageAdjustment * riskAdjustment,
    );

    return {
      diagnosis,
      adjustedProbability,
      riskAdjustment,
      reasoning: `Probability adjusted for age (${patientAge}) and risk factors: ${patientRiskFactors.join(', ') || 'none'}.`,
    };
  }

  /**
   * Get rationales for differential diagnosis
   */
  getRationale(diagnosis: string): string {
    const rules = Object.values(this.diagnosisRules)
      .flat()
      .filter((rule: any) =>
        rule.diagnosis.toLowerCase() === diagnosis.toLowerCase(),
      );

    if (rules.length === 0) {
      return 'No specific rationale available.';
    }

    const rule = rules[0] as any;
    return `Positive factors: ${rule.factors.positive.join(', ')}. Negative factors: ${rule.factors.negative.join(', ')}.`;
  }
}
