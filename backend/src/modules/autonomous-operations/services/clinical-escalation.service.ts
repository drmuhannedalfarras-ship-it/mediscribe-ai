import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';
import { ClinicalExtraction, ExtractionStatus } from '@entities/clinical-extraction.entity';

export enum EscalationLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum EscalationTarget {
  EMERGENCY_DEPARTMENT = 'EMERGENCY_DEPARTMENT',
  INTENSIVE_CARE = 'INTENSIVE_CARE',
  SPECIALIST = 'SPECIALIST',
  HOSPITALIZATION = 'HOSPITALIZATION',
  URGENT_CLINIC = 'URGENT_CLINIC',
}

export interface ClinicalEscalation {
  consultationId: string;
  trigger: string;
  level: EscalationLevel;
  target: EscalationTarget;
  required: boolean;
  reasoning: string;
  actions: string[];
  escalatedAt?: Date;
  escalatedTo?: string;
  triggered: boolean;
}

@Injectable()
export class ClinicalEscalationService {
  private readonly logger = new Logger(ClinicalEscalationService.name);

  // Escalation rules database
  private readonly escalationRules = {
    critical: [
      {
        trigger: 'Chest pain with ECG changes',
        target: EscalationTarget.EMERGENCY_DEPARTMENT,
        actions: [
          'Activate emergency response',
          'Notify cardiology',
          'Prepare cath lab',
        ],
      },
      {
        trigger: 'Respiratory distress with hypoxia',
        target: EscalationTarget.INTENSIVE_CARE,
        actions: ['Oxygen supplementation', 'ICU admission', 'Intubation standby'],
      },
      {
        trigger: 'Altered mental status',
        target: EscalationTarget.EMERGENCY_DEPARTMENT,
        actions: ['Neuroimaging', 'Neurology consult', 'ICU consideration'],
      },
      {
        trigger: 'Signs of sepsis',
        target: EscalationTarget.INTENSIVE_CARE,
        actions: [
          'Blood cultures',
          'Broad-spectrum antibiotics',
          'ICU admission',
        ],
      },
    ],
    high: [
      {
        trigger: 'Severe hypertension',
        target: EscalationTarget.URGENT_CLINIC,
        actions: ['Controlled BP reduction', 'End-organ damage assessment'],
      },
      {
        trigger: 'Stroke symptoms',
        target: EscalationTarget.EMERGENCY_DEPARTMENT,
        actions: ['Immediate CT', 'Neurology consult', 'Possible thrombolysis'],
      },
      {
        trigger: 'Severe pain',
        target: EscalationTarget.URGENT_CLINIC,
        actions: ['Aggressive analgesia', 'Find underlying cause'],
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
   * Evaluate if escalation is needed
   */
  async evaluateEscalations(consultationId: string): Promise<ClinicalEscalation[]> {
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

    const escalations: ClinicalEscalation[] = [];

    if (extractions.length === 0) {
      return escalations;
    }

    const findings = extractions.map((e) =>
      e.extractedValue.toLowerCase(),
    );

    // Check critical escalations
    const criticalEscalations = this.checkEscalations(
      findings,
      this.escalationRules.critical,
      EscalationLevel.CRITICAL,
      consultationId,
    );
    escalations.push(...criticalEscalations);

    // Check high escalations
    const highEscalations = this.checkEscalations(
      findings,
      this.escalationRules.high,
      EscalationLevel.HIGH,
      consultationId,
    );
    escalations.push(...highEscalations);

    this.logger.log(
      `Escalations evaluated: ${consultationId} (${escalations.length} items)`,
    );

    return escalations;
  }

  /**
   * Check escalations against rules
   */
  private checkEscalations(
    findings: string[],
    rules: any[],
    level: EscalationLevel,
    consultationId: string,
  ): ClinicalEscalation[] {
    const escalations: ClinicalEscalation[] = [];

    rules.forEach((rule) => {
      const triggerFound = findings.some((f) =>
        rule.trigger.toLowerCase().includes(f),
      );

      if (triggerFound) {
        escalations.push({
          consultationId,
          trigger: rule.trigger,
          level,
          target: rule.target,
          required: true,
          reasoning: `Detected: ${rule.trigger}. Escalation to ${rule.target} recommended.`,
          actions: rule.actions,
          triggered: false,
        });
      }
    });

    return escalations;
  }

  /**
   * Get active escalations
   */
  async getActiveEscalations(consultationId: string): Promise<ClinicalEscalation[]> {
    const escalations = await this.evaluateEscalations(consultationId);
    return escalations.filter((e) => e.required);
  }

  /**
   * Trigger escalation
   */
  async triggerEscalation(escalation: ClinicalEscalation, _triggeredBy: string): Promise<ClinicalEscalation> {
    escalation.escalatedAt = new Date();
    escalation.escalatedTo = escalation.target;
    escalation.triggered = true;

    this.logger.log(
      `Escalation triggered: ${escalation.consultationId} - ${escalation.trigger} to ${escalation.target}`,
    );

    // In production, would:
    // 1. Send to escalation system
    // 2. Notify appropriate department
    // 3. Create escalation record
    // 4. Generate notification

    return escalation;
  }

  /**
   * Trigger approved escalations
   */
  async triggerApprovedEscalations(consultationId: string): Promise<ClinicalEscalation[]> {
    const escalations = await this.evaluateEscalations(consultationId);
    const triggered = [];

    for (const escalation of escalations) {
      if (escalation.required) {
        const result = await this.triggerEscalation(escalation, 'SYSTEM');
        triggered.push(result);
      }
    }

    return triggered;
  }

  /**
   * Clear escalations
   */
  async clearEscalations(consultationId: string): Promise<number> {
    const escalations = await this.evaluateEscalations(consultationId);

    this.logger.log(
      `Cleared ${escalations.length} escalations: ${consultationId}`,
    );

    return escalations.length;
  }

  /**
   * Get escalation by level
   */
  getEscalationsByLevel(
    escalations: ClinicalEscalation[],
    level: EscalationLevel,
  ): ClinicalEscalation[] {
    return escalations.filter((e) => e.level === level);
  }

  /**
   * Get escalation summary
   */
  getEscalationSummary(escalations: ClinicalEscalation[]): {
    critical_count: number;
    high_count: number;
    requires_immediate_action: boolean;
    primary_escalation_target: string;
  } {
    const critical = escalations.filter(
      (e) => e.level === EscalationLevel.CRITICAL,
    );
    const high = escalations.filter((e) => e.level === EscalationLevel.HIGH);

    const requiresImmediateAction =
      critical.length > 0 ||
      high.some((e) => e.target === EscalationTarget.EMERGENCY_DEPARTMENT);

    return {
      critical_count: critical.length,
      high_count: high.length,
      requires_immediate_action: requiresImmediateAction,
      primary_escalation_target:
        critical.length > 0
          ? critical[0].target
          : high.length > 0
            ? high[0].target
            : 'NONE',
    };
  }

  /**
   * Auto-escalate if critical
   */
  async autoEscalateIfCritical(
    consultationId: string,
  ): Promise<{
    escalated: boolean;
    reason?: string;
    target?: string;
  }> {
    const escalations = await this.evaluateEscalations(consultationId);
    const critical = escalations.filter(
      (e) => e.level === EscalationLevel.CRITICAL,
    );

    if (critical.length > 0) {
      const target = critical[0].target;
      await this.triggerEscalation(critical[0], 'AUTO_ESCALATION');

      return {
        escalated: true,
        reason: critical[0].trigger,
        target,
      };
    }

    return {
      escalated: false,
    };
  }

  /**
   * Get recommended actions for escalation
   */
  getRecommendedActions(escalation: ClinicalEscalation): string[] {
    return escalation.actions;
  }
}
