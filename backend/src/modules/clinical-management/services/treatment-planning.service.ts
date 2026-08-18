import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';

@Injectable()
export class TreatmentPlanningService {
  private readonly logger = new Logger(TreatmentPlanningService.name);

  // Treatment plan database
  private readonly treatmentPlans: Record<
    string,
    Array<{ component: string; interventions: string[]; timing: string; goal: string }>
  > = {
    'acute coronary syndrome': [
      {
        component: 'Immediate Stabilization',
        interventions: [
          'Oxygen (maintain SpO2 >94%)',
          'IV access',
          'Continuous cardiac monitoring',
          'Pain relief (morphine 2-4mg IV)',
        ],
        timing: 'First 30 minutes',
        goal: 'Stabilize hemodynamics',
      },
      {
        component: 'Reperfusion Strategy',
        interventions: [
          'PCI if within 120 minutes of first medical contact',
          'Thrombolysis if PCI not available',
          'Dual antiplatelet therapy',
        ],
        timing: 'First 2 hours',
        goal: 'Restore coronary flow',
      },
      {
        component: 'Acute Phase Medications',
        interventions: [
          'Aspirin + P2Y12 inhibitor',
          'Anticoagulation (heparin/enoxaparin)',
          'Beta-blocker (if tolerated)',
          'ACE inhibitor (within 24 hours)',
        ],
        timing: 'In hospital',
        goal: 'Reduce infarct size',
      },
      {
        component: 'Discharge Planning',
        interventions: [
          'Statin therapy',
          'Beta-blocker continuation',
          'Cardiac rehabilitation referral',
          'Risk factor modification education',
        ],
        timing: 'At discharge',
        goal: 'Prevent recurrence',
      },
    ],
    'pneumonia': [
      {
        component: 'Initial Assessment',
        interventions: [
          'Oxygen support if SpO2 <90%',
          'Chest X-ray confirmation',
          'Blood cultures before antibiotics',
          'Sputum culture',
        ],
        timing: 'First 1-2 hours',
        goal: 'Confirm diagnosis, identify organism',
      },
      {
        component: 'Antibiotic Therapy',
        interventions: [
          'Start empiric antibiotics early (within 1 hour)',
          'Amoxicillin-clavulanate or respiratory fluoroquinolone',
          'Adjust based on culture results',
        ],
        timing: 'First 1-4 hours',
        goal: 'Control infection',
      },
      {
        component: 'Supportive Care',
        interventions: [
          'IV fluid replacement',
          'Antipyretics',
          'Analgesia as needed',
          'Monitor vital signs',
        ],
        timing: 'Throughout admission',
        goal: 'Support recovery',
      },
      {
        component: 'Discharge Planning',
        interventions: [
          'Oral antibiotics 5-10 days total',
          'Follow-up chest X-ray in 4-6 weeks',
          'Smoking cessation if applicable',
          'Vaccination (pneumococcal, influenza)',
        ],
        timing: 'At discharge',
        goal: 'Ensure complete recovery',
      },
    ],
    'heart failure': [
      {
        component: 'Acute Decompensation Management',
        interventions: [
          'Diuretics (IV furosemide)',
          'Oxygen if hypoxic',
          'Vasodilators (nitroglycerin)',
          'Inotropic support if needed',
        ],
        timing: 'First few hours',
        goal: 'Relieve congestion',
      },
      {
        component: 'Chronic Management',
        interventions: [
          'ACE inhibitor or ARB',
          'Beta-blocker',
          'Aldosterone antagonist',
          'Diuretics (oral)',
        ],
        timing: 'Long-term',
        goal: 'Prevent progression',
      },
      {
        component: 'Device Therapy',
        interventions: [
          'Assess for ICD or CRT if EF <35%',
          'Cardiac resynchronization therapy',
        ],
        timing: 'After optimization',
        goal: 'Improve outcomes',
      },
    ],
    'hypertension': [
      {
        component: 'Lifestyle Modification',
        interventions: [
          'Sodium restriction (<2.3g/day)',
          'DASH diet',
          'Regular aerobic exercise (150min/week)',
          'Weight loss if overweight',
          'Alcohol moderation',
          'Stress management',
        ],
        timing: 'Ongoing',
        goal: 'First-line treatment',
      },
      {
        component: 'Pharmacotherapy',
        interventions: [
          'Monotherapy or combination agents',
          'ACE-I, ARB, CCB, or thiazide',
          'Titrate to goal BP',
        ],
        timing: 'Start 3-6 months after lifestyle changes',
        goal: 'Achieve BP <130/80',
      },
      {
        component: 'Monitoring',
        interventions: [
          'Home BP monitoring',
          'Annual lab work (electrolytes, renal function)',
          'Follow-up visits every 3-6 months',
        ],
        timing: 'Long-term',
        goal: 'Maintain control',
      },
    ],
  };

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
  ) {}

  /**
   * Generate comprehensive treatment plan
   */
  async generateTreatmentPlan(
    consultationId: string,
  ): Promise<Array<{
    component: string;
    interventions: string[];
    timing: string;
    goal: string;
  }>> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Get applicable treatment plan
    // In production, would extract from clinical note/diagnosis
    const plan = this.treatmentPlans['hypertension'] || [];

    this.logger.log(
      `Treatment plan generated: ${consultationId} (${plan.length} components)`,
    );

    return plan;
  }

  /**
   * Get treatment component
   */
  getTreatmentComponent(condition: string, component: string): any {
    const plans = this.treatmentPlans[condition.toLowerCase()] || [];
    return plans.find((p) => p.component === component);
  }

  /**
   * Get urgent interventions
   */
  getUrgentInterventions(condition: string): string[] {
    const plans = this.treatmentPlans[condition.toLowerCase()] || [];
    const urgentPlans = plans.filter((p) =>
      p.timing.toLowerCase().includes('first'),
    );

    return urgentPlans.flatMap((p) => p.interventions);
  }

  /**
   * Get discharge planning
   */
  getDischargePlan(condition: string): Array<{
    intervention: string;
    timing: string;
    rationale: string;
  }> {
    const plans = this.treatmentPlans[condition.toLowerCase()] || [];
    const dischargePlans = plans.filter((p) =>
      p.timing.toLowerCase().includes('discharge'),
    );

    return dischargePlans.flatMap((p) =>
      p.interventions.map((intervention) => ({
        intervention,
        timing: p.timing,
        rationale: p.goal,
      })),
    );
  }

  /**
   * Customize treatment plan based on patient factors
   */
  customizeTreatmentPlan(
    basePlan: Array<{
      component: string;
      interventions: string[];
      timing: string;
      goal: string;
    }>,
    patientFactors: {
      age?: number;
      comorbidities?: string[];
      pregnant?: boolean;
      renalFunction?: 'normal' | 'mild' | 'moderate' | 'severe';
    },
  ): Array<{
    component: string;
    interventions: string[];
    timing: string;
    goal: string;
    modifications?: string[];
  }> {
    return basePlan.map((component) => {
      const modifications: string[] = [];

      if (patientFactors.age && patientFactors.age > 75) {
        modifications.push(
          'Consider dose reductions due to advanced age',
        );
      }

      if (patientFactors.pregnant) {
        modifications.push('Ensure all medications are pregnancy-safe');
      }

      if (
        patientFactors.renalFunction &&
        patientFactors.renalFunction !== 'normal'
      ) {
        modifications.push('Adjust dosing for renal function');
      }

      return {
        ...component,
        modifications: modifications.length > 0 ? modifications : undefined,
      };
    });
  }

  /**
   * Get timeline for treatment plan
   */
  getTreatmentTimeline(condition: string): Array<{
    timeframe: string;
    interventions: string[];
  }> {
    const plans = this.treatmentPlans[condition.toLowerCase()] || [];

    const timeline = [
      {
        timeframe: 'Immediate (first 2 hours)',
        interventions: plans
          .filter((p) => p.timing.includes('First') || p.timing.includes('hour'))
          .flatMap((p) => p.interventions),
      },
      {
        timeframe: 'Short-term (24-72 hours)',
        interventions: plans
          .filter((p) =>
            p.timing.includes('hours') || p.timing.includes('In hospital'),
          )
          .flatMap((p) => p.interventions),
      },
      {
        timeframe: 'Long-term (ongoing)',
        interventions: plans
          .filter((p) =>
            p.timing.includes('Long-term') || p.timing.includes('ongoing'),
          )
          .flatMap((p) => p.interventions),
      },
    ];

    return timeline.filter((t) => t.interventions.length > 0);
  }

  /**
   * Get expected outcomes
   */
  getExpectedOutcomes(condition: string): Array<{
    timeframe: string;
    outcome: string;
    indicators: string[];
  }> {
    const outcomeMap: {
      [key: string]: Array<{
        timeframe: string;
        outcome: string;
        indicators: string[];
      }>;
    } = {
      'acute coronary syndrome': [
        {
          timeframe: '24 hours',
          outcome: 'Pain-free, hemodynamically stable',
          indicators: ['Resolution of chest pain', 'Normal vital signs'],
        },
        {
          timeframe: '48-72 hours',
          outcome: 'Troponin peak and decline',
          indicators: ['Peak troponin', 'Declining troponin', 'EKG changes'],
        },
        {
          timeframe: '3-5 days',
          outcome: 'Discharge home on secondary prevention',
          indicators: ['Stable vitals', 'Stable EKG', 'No complications'],
        },
      ],
      'pneumonia': [
        {
          timeframe: '24-48 hours',
          outcome: 'Clinical improvement',
          indicators: [
            'Fever reduction',
            'Improved oxygen saturation',
            'Better cough control',
          ],
        },
        {
          timeframe: '5-7 days',
          outcome: 'CXR improvement',
          indicators: ['Partial resolution on imaging', 'Improved respiratory status'],
        },
      ],
    };

    return outcomeMap[condition.toLowerCase()] || [];
  }
}
