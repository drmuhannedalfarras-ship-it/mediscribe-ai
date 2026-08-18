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
export class InvestigationRecommendationService {
  private readonly logger = new Logger(InvestigationRecommendationService.name);

  // Clinical investigation rules
  private readonly investigationRules: Record<
    string,
    Array<{
      investigation: string;
      type: string;
      indication: string;
      priority: 'urgent' | 'high' | 'medium';
      reasoning: string;
    }>
  > = {
    'chest pain': [
      {
        investigation: 'Electrocardiogram (ECG/EKG)',
        type: 'electrical',
        indication: 'Assess for acute cardiac ischemia',
        priority: 'urgent' as const,
        reasoning: 'Essential in chest pain evaluation to rule out ACS',
      },
      {
        investigation: 'Troponin (high-sensitivity)',
        type: 'laboratory',
        indication: 'Cardiac biomarker for myocardial injury',
        priority: 'urgent' as const,
        reasoning: 'Identify myocardial infarction',
      },
      {
        investigation: 'Complete Blood Count (CBC)',
        type: 'laboratory',
        indication: 'Assess for infection, anemia',
        priority: 'high' as const,
        reasoning: 'General assessment of hematologic status',
      },
      {
        investigation: 'Chest X-Ray',
        type: 'imaging',
        indication: 'Assess cardiac silhouette, lung fields',
        priority: 'high' as const,
        reasoning: 'Evaluate for pulmonary and cardiac causes',
      },
    ],
    'dyspnea': [
      {
        investigation: 'Chest X-Ray',
        type: 'imaging',
        indication: 'Pulmonary pathology assessment',
        priority: 'high' as const,
        reasoning: 'Primary imaging for dyspnea',
      },
      {
        investigation: 'Oxygen saturation (pulse oximetry)',
        type: 'vital signs',
        indication: 'Assess oxygenation',
        priority: 'urgent' as const,
        reasoning: 'Immediate assessment of hypoxemia',
      },
      {
        investigation: 'BNP (B-type Natriuretic Peptide)',
        type: 'laboratory',
        indication: 'Assess for heart failure',
        priority: 'high' as const,
        reasoning: 'Differentiate cardiac from pulmonary causes',
      },
      {
        investigation: 'D-Dimer',
        type: 'laboratory',
        indication: 'Pulmonary embolism screening',
        priority: 'medium' as const,
        reasoning: 'Consider if PE is in differential',
      },
    ],
    'fever': [
      {
        investigation: 'Complete Blood Count (CBC)',
        type: 'laboratory',
        indication: 'Assess white blood cell count and differential',
        priority: 'high' as const,
        reasoning: 'Essential for infection assessment',
      },
      {
        investigation: 'Blood Cultures',
        type: 'microbiology',
        indication: 'Identify bacteremia',
        priority: 'high' as const,
        reasoning: 'Culture before antibiotics if infection suspected',
      },
      {
        investigation: 'Comprehensive Metabolic Panel (CMP)',
        type: 'laboratory',
        indication: 'Assess organ function',
        priority: 'high' as const,
        reasoning: 'Evaluate for sepsis or organ involvement',
      },
      {
        investigation: 'Urinalysis with Culture',
        type: 'laboratory',
        indication: 'Rule out urinary tract infection',
        priority: 'medium' as const,
        reasoning: 'Common source of fever',
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
   * Recommend investigations based on clinical presentation
   */
  async recommendInvestigations(
    consultationId: string,
  ): Promise<Array<{
    investigation: string;
    type: string;
    indication: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    reasoning: string;
    evidence: string[];
  }>> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
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

    if (extractions.length === 0) {
      return [];
    }

    const findings = extractions.map((e) =>
      e.extractedValue.toLowerCase(),
    );

    // Get applicable investigations
    const recommendations = this.getApplicableInvestigations(findings);

    // Add supporting evidence
    const withEvidence = recommendations.map((rec) => ({
      ...rec,
      evidence: findings.filter((f) =>
        rec.indication.toLowerCase().includes(f),
      ),
    }));

    this.logger.log(
      `Investigations recommended: ${consultationId} (${withEvidence.length} items)`,
    );

    return withEvidence;
  }

  /**
   * Get urgent investigations only
   */
  async getUrgentInvestigations(
    consultationId: string,
  ): Promise<Array<{
    investigation: string;
    type: string;
    indication: string;
    priority: 'urgent';
    reasoning: string;
    evidence: string[];
  }>> {
    const recommendations = await this.recommendInvestigations(consultationId);

    return recommendations.filter(
      (r) => r.priority === 'urgent',
    ) as Array<{
      investigation: string;
      type: string;
      indication: string;
      priority: 'urgent';
      reasoning: string;
      evidence: string[];
    }>;
  }

  /**
   * Get applicable investigations for findings
   */
  private getApplicableInvestigations(
    findings: string[],
  ): Array<{
    investigation: string;
    type: string;
    indication: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    reasoning: string;
  }> {
    const recommendations: Array<{
      investigation: string;
      type: string;
      indication: string;
      priority: 'urgent' | 'high' | 'medium' | 'low';
      reasoning: string;
    }> = [];

    // Check each finding against investigation rules
    Object.entries(this.investigationRules).forEach(
      ([finding, investigations]: [string, any]) => {
        if (findings.some((f) => f.includes(finding.toLowerCase()))) {
          recommendations.push(...investigations);
        }
      },
    );

    // Remove duplicates
    const unique = Array.from(
      new Map(
        recommendations.map((item) => [item.investigation, item]),
      ).values(),
    );

    return unique;
  }

  /**
   * Recommend investigation by symptom
   */
  async getInvestigationsForSymptom(
    symptom: string,
  ): Promise<Array<{
    investigation: string;
    type: string;
    indication: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    reasoning: string;
  }>> {
    const rules = this.investigationRules[symptom.toLowerCase()] || [];

    if (rules.length === 0) {
      return this.getGeneralInvestigations();
    }

    return rules;
  }

  /**
   * General investigations for any consultation
   */
  private getGeneralInvestigations(): Array<{
    investigation: string;
    type: string;
    indication: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    reasoning: string;
  }> {
    return [
      {
        investigation: 'Vital Signs',
        type: 'vital signs',
        indication: 'Baseline assessment',
        priority: 'high',
        reasoning: 'Essential baseline in any consultation',
      },
      {
        investigation: 'Physical Examination',
        type: 'physical',
        indication: 'Focused examination',
        priority: 'high',
        reasoning: 'Complete the clinical assessment',
      },
    ];
  }

  /**
   * Prioritize investigations by urgency
   */
  async prioritizeInvestigations(
    consultationId: string,
  ): Promise<{
    urgent: any[];
    high: any[];
    medium: any[];
    low: any[];
  }> {
    const investigations = await this.recommendInvestigations(consultationId);

    return {
      urgent: investigations.filter((i) => i.priority === 'urgent'),
      high: investigations.filter((i) => i.priority === 'high'),
      medium: investigations.filter((i) => i.priority === 'medium'),
      low: investigations.filter((i) => i.priority === 'low'),
    };
  }

  /**
   * Get cost-effective investigations
   */
  getEfficientInvestigations(
    condition: string,
  ): Array<{
    investigation: string;
    type: string;
    indication: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    reasoning: string;
    rationale: string;
  }> {
    const rules = this.investigationRules[condition.toLowerCase()] || [];

    return rules.map((rule: any) => ({
      ...rule,
      rationale: `${rule.investigation} is high-yield for ${condition}`,
    }));
  }

  /**
   * Get investigation alternatives
   */
  getInvestigationAlternatives(
    primaryInvestigation: string,
  ): Array<{
    investigation: string;
    type: string;
    pros: string[];
    cons: string[];
    indication: string;
  }> {
    const alternatives: {
      [key: string]: Array<{
        investigation: string;
        type: string;
        pros: string[];
        cons: string[];
        indication: string;
      }>;
    } = {
      'Electrocardiogram (ECG/EKG)': [
        {
          investigation: 'Continuous Cardiac Monitoring',
          type: 'electrical',
          pros: ['Real-time monitoring', 'Detects arrhythmias'],
          cons: ['More resource-intensive', 'Requires ICU'],
          indication: 'High-risk patients requiring continuous assessment',
        },
      ],
      'Chest X-Ray': [
        {
          investigation: 'CT Chest with Pulmonary Embolism Protocol',
          type: 'imaging',
          pros: ['Higher sensitivity for PE', 'Better detail'],
          cons: ['Radiation exposure', 'Cost'],
          indication: 'High suspicion for PE',
        },
      ],
    };

    return alternatives[primaryInvestigation] || [];
  }

  /**
   * Get investigation ordering checklist
   */
  getOrderingChecklist(_consultationId: string): Promise<{
    recommendations: any[];
    checklist: {
      item: string;
      recommended: boolean;
      ordered: boolean;
      notes?: string;
    }[];
  }> {
    // This would be implemented with actual EHR data
    return Promise.resolve({
      recommendations: [],
      checklist: [],
    });
  }
}
