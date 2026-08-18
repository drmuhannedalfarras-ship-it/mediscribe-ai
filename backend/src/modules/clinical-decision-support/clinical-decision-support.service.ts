import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';
import { DifferentialDiagnosisService } from './services/differential-diagnosis.service';
import { MissingInformationService } from './services/missing-information.service';
import { InvestigationRecommendationService } from './services/investigation-recommendation.service';
import { EvidenceRetrievalService } from './services/evidence-retrieval.service';
import { RedFlagDetectionService } from './services/red-flag-detection.service';

@Injectable()
export class ClinicalDecisionSupportService {
  private readonly logger = new Logger(ClinicalDecisionSupportService.name);

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    private readonly differentialDiagnosisService: DifferentialDiagnosisService,
    private readonly missingInformationService: MissingInformationService,
    private readonly investigationService: InvestigationRecommendationService,
    private readonly evidenceService: EvidenceRetrievalService,
    private readonly redFlagService: RedFlagDetectionService,
  ) {}

  /**
   * Get comprehensive clinical decision support for a consultation
   * This is the main entry point that aggregates all clinical intelligence
   */
  async getComprehensiveSupport(
    consultationId: string,
  ): Promise<{
    consultation: Consultation;
    redFlags: any[];
    differentialDiagnosis: any[];
    missingInformation: any[];
    investigations: any[];
    evidence: any[];
    summary: string;
    confidence: number;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
      relations: [
        'patient',
        'clinicalExtractions',
        'clinicalNote',
        'audioSession',
      ],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Get all clinical intelligence
    const redFlags = await this.redFlagService.detectRedFlags(consultationId);
    const differentialDiagnosis =
      await this.differentialDiagnosisService.generateDifferentialDiagnosis(
        consultationId,
      );
    const missingInformation =
      await this.missingInformationService.identifyMissingInformation(
        consultationId,
      );
    const investigations =
      await this.investigationService.recommendInvestigations(consultationId);
    const evidence = await this.evidenceService.retrieveEvidence(consultationId);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      redFlags,
      differentialDiagnosis,
      investigations,
    );

    // Generate summary
    const summary = this.generateSummary(
      redFlags,
      differentialDiagnosis,
      missingInformation,
      investigations,
    );

    this.logger.log(
      `Clinical decision support retrieved: ${consultationId} (Confidence: ${confidence.toFixed(2)})`,
    );

    return {
      consultation,
      redFlags,
      differentialDiagnosis,
      missingInformation,
      investigations,
      evidence,
      summary,
      confidence,
    };
  }

  /**
   * Get differential diagnosis for a consultation
   */
  async getDifferentialDiagnosis(
    consultationId: string,
  ): Promise<Array<{
    diagnosis: string;
    icdCode?: string;
    probability: number;
    reasoning: string;
    evidence: string[];
  }>> {
    return this.differentialDiagnosisService.generateDifferentialDiagnosis(
      consultationId,
    );
  }

  /**
   * Get missing clinical information
   */
  async getMissingInformation(
    consultationId: string,
  ): Promise<Array<{
    category: string;
    question: string;
    relevance: 'high' | 'medium' | 'low';
    reasoning: string;
  }>> {
    return this.missingInformationService.identifyMissingInformation(
      consultationId,
    );
  }

  /**
   * Get investigation recommendations
   */
  async getInvestigationRecommendations(
    consultationId: string,
  ): Promise<Array<{
    investigation: string;
    type: string;
    indication: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    reasoning: string;
    evidence: string[];
  }>> {
    return this.investigationService.recommendInvestigations(consultationId);
  }

  /**
   * Get clinical evidence and guidelines
   */
  async getEvidence(
    consultationId: string,
  ): Promise<Array<{
    title: string;
    source: string;
    url?: string;
    relevance: number;
    excerpt?: string;
  }>> {
    return this.evidenceService.retrieveEvidence(consultationId);
  }

  /**
   * Get red flags and safety alerts
   */
  async getRedFlags(
    consultationId: string,
  ): Promise<Array<{
    flag: string;
    severity: 'critical' | 'high' | 'medium';
    description: string;
    action: string;
  }>> {
    return this.redFlagService.detectRedFlags(consultationId);
  }

  /**
   * Get clinical support with filtering
   */
  async getSupportFiltered(
    consultationId: string,
    filterBy?: 'red_flags' | 'differentials' | 'investigations' | 'missing_info',
  ): Promise<any> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    switch (filterBy) {
      case 'red_flags':
        return {
          redFlags: await this.redFlagService.detectRedFlags(consultationId),
        };
      case 'differentials':
        return {
          differentials:
            await this.differentialDiagnosisService.generateDifferentialDiagnosis(
              consultationId,
            ),
        };
      case 'investigations':
        return {
          investigations: await this.investigationService.recommendInvestigations(
            consultationId,
          ),
        };
      case 'missing_info':
        return {
          missingInfo:
            await this.missingInformationService.identifyMissingInformation(
              consultationId,
            ),
        };
      default:
        return this.getComprehensiveSupport(consultationId);
    }
  }

  /**
   * Helper: Calculate overall confidence score
   */
  private calculateOverallConfidence(
    redFlags: any[],
    differentials: any[],
    investigations: any[],
  ): number {
    // Start with base confidence from differentials
    let confidence = 0.5;

    if (differentials.length > 0) {
      // Use highest probability differential
      const maxProbability = Math.max(
        ...differentials.map((d) => d.probability || 0),
      );
      confidence = maxProbability;
    }

    // Reduce confidence if critical red flags
    const criticalFlags = redFlags.filter((f) => f.severity === 'critical');
    if (criticalFlags.length > 0) {
      confidence *= 0.8; // 20% penalty for critical flags
    }

    // Increase confidence slightly with investigations
    if (investigations.length > 0) {
      const urgentInvestigations = investigations.filter(
        (i) => i.priority === 'urgent',
      );
      if (urgentInvestigations.length > 0) {
        confidence *= 0.9; // Slight penalty, needs investigation
      }
    }

    return Math.max(0, Math.min(1, confidence)); // Clamp to 0-1
  }

  /**
   * Helper: Generate executive summary
   */
  private generateSummary(
    redFlags: any[],
    differentials: any[],
    missingInfo: any[],
    investigations: any[],
  ): string {
    let summary = '';

    if (redFlags.length > 0) {
      const criticalCount = redFlags.filter(
        (f) => f.severity === 'critical',
      ).length;
      summary += `⚠️ ${criticalCount} critical alert(s) detected. `;
    }

    if (differentials.length > 0) {
      const topDiagnosis = differentials[0];
      summary += `🔍 Most likely: ${topDiagnosis.diagnosis} (${(topDiagnosis.probability * 100).toFixed(0)}%). `;
    }

    if (missingInfo.length > 0) {
      const highPriority = missingInfo.filter(
        (m) => m.relevance === 'high',
      ).length;
      summary += `❓ ${highPriority} high-priority question(s) to clarify. `;
    }

    if (investigations.length > 0) {
      const urgentInvestigations = investigations.filter(
        (i) => i.priority === 'urgent',
      ).length;
      summary += `🧪 ${urgentInvestigations} urgent investigation(s) recommended.`;
    }

    return summary || 'No specific clinical decision support items.';
  }
}
