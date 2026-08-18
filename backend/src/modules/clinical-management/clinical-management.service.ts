import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';
import { MedicationManagementService } from './services/medication-management.service';
import { TreatmentPlanningService } from './services/treatment-planning.service';
import { MonitoringAndFollowUpService } from './services/monitoring-and-follow-up.service';
import { MedicationSafetyService } from './services/medication-safety.service';

@Injectable()
export class ClinicalManagementService {
  private readonly logger = new Logger(ClinicalManagementService.name);

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    private readonly medicationService: MedicationManagementService,
    private readonly treatmentService: TreatmentPlanningService,
    private readonly monitoringService: MonitoringAndFollowUpService,
    private readonly safetyService: MedicationSafetyService,
  ) {}

  /**
   * Get comprehensive management plan for a consultation
   */
  async getComprehensiveManagementPlan(
    consultationId: string,
  ): Promise<{
    consultation: Consultation;
    treatmentPlan: any[];
    medications: any[];
    safetyAlerts: any;
    monitoring: any[];
    followUp: any[];
    summary: string;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
      relations: ['patient', 'clinicalNote'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Get all management components
    const treatmentPlan = await this.treatmentService.generateTreatmentPlan(
      consultationId,
    );
    const medications = await this.medicationService.recommendMedications(
      consultationId,
    );
    const safetyAlerts = await this.safetyService.performComprehensiveCheck(
      consultationId,
    );
    const monitoring = await this.monitoringService.getMonitoringPlan(
      consultationId,
    );
    const followUp = await this.monitoringService.getFollowUpPlan(
      consultationId,
    );

    const summary = this.generateManagementSummary(
      treatmentPlan,
      medications,
      monitoring,
      [
        ...safetyAlerts.contraindications,
        ...safetyAlerts.interactions,
        ...safetyAlerts.allergies,
      ],
    );

    this.logger.log(
      `Comprehensive management plan retrieved: ${consultationId}`,
    );

    return {
      consultation,
      treatmentPlan,
      medications,
      safetyAlerts,
      monitoring,
      followUp,
      summary,
    };
  }

  /**
   * Get treatment plan for diagnosis
   */
  async getTreatmentPlan(consultationId: string): Promise<any[]> {
    return this.treatmentService.generateTreatmentPlan(consultationId);
  }

  /**
   * Get medication recommendations
   */
  async getMedicationRecommendations(consultationId: string): Promise<any[]> {
    return this.medicationService.recommendMedications(consultationId);
  }

  /**
   * Get monitoring and follow-up plan
   */
  async getMonitoringAndFollowUpPlan(
    consultationId: string,
  ): Promise<{
    monitoring: any[];
    followUp: any[];
  }> {
    const monitoring = await this.monitoringService.getMonitoringPlan(
      consultationId,
    );
    const followUp = await this.monitoringService.getFollowUpPlan(
      consultationId,
    );

    return { monitoring, followUp };
  }

  /**
   * Perform medication safety checks
   */
  async checkMedicationSafety(consultationId: string): Promise<{
    contraindications: any[];
    interactions: any[];
    allergies: any[];
    recommendations: string[];
  }> {
    return this.safetyService.performComprehensiveCheck(consultationId);
  }

  /**
   * Get management plan with filters
   */
  async getManagementFiltered(
    consultationId: string,
    filterBy?:
      | 'treatment'
      | 'medications'
      | 'monitoring'
      | 'safety'
      | 'follow_up',
  ): Promise<any> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    switch (filterBy) {
      case 'treatment':
        return {
          treatmentPlan: await this.treatmentService.generateTreatmentPlan(
            consultationId,
          ),
        };
      case 'medications':
        return {
          medications: await this.medicationService.recommendMedications(
            consultationId,
          ),
        };
      case 'monitoring':
        return {
          monitoring: await this.monitoringService.getMonitoringPlan(
            consultationId,
          ),
        };
      case 'safety':
        return {
          safety: await this.safetyService.performComprehensiveCheck(
            consultationId,
          ),
        };
      case 'follow_up':
        return {
          followUp: await this.monitoringService.getFollowUpPlan(
            consultationId,
          ),
        };
      default:
        return this.getComprehensiveManagementPlan(consultationId);
    }
  }

  /**
   * Helper: Generate management summary
   */
  private generateManagementSummary(
    treatmentPlan: any[],
    medications: any[],
    monitoring: any[],
    safetyAlerts: any[],
  ): string {
    let summary = '';

    if (treatmentPlan.length > 0) {
      summary += `📋 Treatment: ${treatmentPlan.length} option(s). `;
    }

    if (medications.length > 0) {
      summary += `💊 Medications: ${medications.length} recommended. `;
    }

    if (monitoring.length > 0) {
      summary += `📊 Monitoring: ${monitoring.length} measure(s). `;
    }

    if (safetyAlerts.length > 0) {
      const totalAlerts = safetyAlerts.reduce(
        (sum, alert) => sum + (alert.count || 1),
        0,
      );
      summary += `⚠️ ${totalAlerts} safety consideration(s). `;
    }

    return summary || 'Management plan under development.';
  }
}
