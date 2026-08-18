import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';

@Injectable()
export class MonitoringAndFollowUpService {
  private readonly logger = new Logger(MonitoringAndFollowUpService.name);

  // Monitoring parameters
  private readonly monitoringRules: Record<
    string,
    Array<{ parameter: string; timing: string; target: string; action: string }>
  > = {
    'acute coronary syndrome': [
      {
        parameter: 'Troponin',
        timing: 'Every 3 hours x3, then daily',
        target: 'Trending upward then down',
        action: 'Peak correlates with infarct size',
      },
      {
        parameter: 'Cardiac enzymes',
        timing: 'Serial every 8 hours',
        target: 'CK-MB elevation and decline',
        action: 'Confirms myocardial necrosis',
      },
      {
        parameter: 'ECG',
        timing: 'At presentation, Q wave changes',
        target: 'ST elevation resolution',
        action: 'Monitor for arrhythmias',
      },
      {
        parameter: 'Blood pressure',
        timing: 'Continuous in ICU, then hourly',
        target: 'MAP >65mmHg',
        action: 'Adjust vasoactive drugs',
      },
    ],
    'heart failure': [
      {
        parameter: 'Fluid intake/output',
        timing: 'Daily',
        target: 'Negative or neutral balance',
        action: 'Adjust diuretics',
      },
      {
        parameter: 'Weight',
        timing: 'Daily (patient to weigh at home)',
        target: 'Loss of 2-3lbs/day initially',
        action: 'Alert if 3lb gain in 1 day',
      },
      {
        parameter: 'BNP/NT-proBNP',
        timing: 'Baseline, then periodically',
        target: 'Declining trend',
        action: 'Prognostic indicator',
      },
      {
        parameter: 'Ejection fraction',
        timing: 'Baseline echocardiography',
        target: 'Improvement with therapy',
        action: 'Reassess 3-6 months',
      },
      {
        parameter: 'Renal function',
        timing: 'Weekly initially, then monthly',
        target: 'Stable or improving',
        action: 'Creatinine must not double',
      },
    ],
    'hypertension': [
      {
        parameter: 'Blood pressure',
        timing: 'Home monitoring daily',
        target: '<130/80 mmHg',
        action: 'Adjust medications',
      },
      {
        parameter: 'Potassium',
        timing: 'Baseline, 1-2 weeks, then annual',
        target: '3.5-5.0 mEq/L',
        action: 'If on ACE-I or ARB',
      },
      {
        parameter: 'Creatinine',
        timing: 'Annual',
        target: 'Stable baseline',
        action: 'Monitor renal function',
      },
    ],
  };

  // Follow-up plans
  private readonly followUpPlans: Record<
    string,
    Array<{ timeframe: string; activities: string[] }>
  > = {
    'acute coronary syndrome': [
      {
        timeframe: '1 week',
        activities: [
          'Phone call to check symptoms',
          'Verify medication adherence',
          'Assess chest pain recurrence',
        ],
      },
      {
        timeframe: '2-4 weeks',
        activities: [
          'Office visit for evaluation',
          'EKG if symptoms recur',
          'Assess medication tolerance',
          'Stress test planning',
        ],
      },
      {
        timeframe: '6-8 weeks',
        activities: [
          'Stress test or imaging',
          'Cardiac rehabilitation completion',
          'Risk factor modification review',
        ],
      },
      {
        timeframe: 'Long-term (every 3-6 months)',
        activities: [
          'Ongoing cardiology care',
          'Medications optimization',
          'Risk factor management',
        ],
      },
    ],
    'pneumonia': [
      {
        timeframe: '7-10 days',
        activities: [
          'Phone call to assess improvement',
          'Confirm continued antibiotic use',
        ],
      },
      {
        timeframe: '4-6 weeks',
        activities: [
          'Follow-up CXR if risk factors',
          'Office visit to confirm clinical resolution',
          'Assess for complications',
        ],
      },
      {
        timeframe: 'Ongoing',
        activities: [
          'Smoking cessation if applicable',
          'Vaccination review (pneumococcal, influenza)',
        ],
      },
    ],
    'heart failure': [
      {
        timeframe: '1-2 weeks',
        activities: [
          'Phone contact with nurse',
          'Weight and symptoms check',
          'Medication adjustment if needed',
        ],
      },
      {
        timeframe: '2-4 weeks',
        activities: [
          'Office visit',
          'Physical exam',
          'Labs (BNP, renal function, electrolytes)',
          'Echocardiography if clinically indicated',
        ],
      },
      {
        timeframe: '2-3 months',
        activities: [
          'Repeat office visits',
          'Medication optimization',
          'Assess for worsening symptoms',
        ],
      },
      {
        timeframe: 'Long-term (every 3-6 months)',
        activities: [
          'Ongoing cardiology care',
          'Device checks (if ICD/CRT)',
          'Reassess ejection fraction yearly',
        ],
      },
    ],
  };

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
  ) {}

  /**
   * Get monitoring plan for a consultation
   */
  async getMonitoringPlan(
    consultationId: string,
  ): Promise<Array<{
    parameter: string;
    timing: string;
    target: string;
    action: string;
  }>> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Get applicable monitoring rules
    const plan = this.monitoringRules['hypertension'] || [];

    this.logger.log(
      `Monitoring plan retrieved: ${consultationId} (${plan.length} parameters)`,
    );

    return plan;
  }

  /**
   * Get follow-up plan for a consultation
   */
  async getFollowUpPlan(
    consultationId: string,
  ): Promise<Array<{
    timeframe: string;
    activities: string[];
  }>> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Get applicable follow-up plan
    const plan = this.followUpPlans['hypertension'] || [];

    this.logger.log(
      `Follow-up plan retrieved: ${consultationId} (${plan.length} timeframes)`,
    );

    return plan;
  }

  /**
   * Get monitoring parameters for condition
   */
  getMonitoringParameters(condition: string): Array<{
    parameter: string;
    timing: string;
  }> {
    const rules = this.monitoringRules[condition.toLowerCase()] || [];
    return rules.map((r) => ({
      parameter: r.parameter,
      timing: r.timing,
    }));
  }

  /**
   * Get next follow-up appointment
   */
  getNextFollowUpAppointment(
    condition: string,
    currentDate: Date = new Date(),
  ): {
    timeframe: string;
    suggestedDate: Date;
    activities: string[];
  } {
    const plans = this.followUpPlans[condition.toLowerCase()] || [];
    if (plans.length === 0) {
      return {
        timeframe: 'Unknown',
        suggestedDate: new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        activities: [],
      };
    }

    const firstPlan = plans[0];
    const daysMatch = firstPlan.timeframe.match(/(\d+)/);
    const days = daysMatch ? parseInt(daysMatch[1]) : 7;

    const suggestedDate = new Date(
      currentDate.getTime() + days * 24 * 60 * 60 * 1000,
    );

    return {
      timeframe: firstPlan.timeframe,
      suggestedDate,
      activities: firstPlan.activities,
    };
  }

  /**
   * Create monitoring checklist
   */
  createMonitoringChecklist(
    condition: string,
  ): Array<{
    parameter: string;
    checked: boolean;
    date?: Date;
    value?: string;
  }> {
    const rules = this.monitoringRules[condition.toLowerCase()] || [];
    return rules.map((r) => ({
      parameter: r.parameter,
      checked: false,
    }));
  }

  /**
   * Get home monitoring instructions
   */
  getHomeMonitoringInstructions(condition: string): {
    parameters: string[];
    frequency: string;
    whenToContactDoctor: string[];
  } {
    const instructions: {
      [key: string]: {
        parameters: string[];
        frequency: string;
        whenToContactDoctor: string[];
      };
    } = {
      'heart failure': {
        parameters: ['Weight', 'Shortness of breath', 'Leg swelling', 'Fatigue'],
        frequency: 'Daily, same time, same clothes',
        whenToContactDoctor: [
          'Weight gain >2-3 lbs in 1 day',
          'Weight gain >3-5 lbs in 1 week',
          'Worsening shortness of breath',
          'New or worsening leg swelling',
          'Chest discomfort',
          'Severe fatigue',
        ],
      },
      'hypertension': {
        parameters: ['Blood pressure', 'Symptoms'],
        frequency: 'Daily, morning and evening',
        whenToContactDoctor: [
          'BP >180/110 sustained',
          'Severe headache',
          'Chest pain',
          'Shortness of breath',
        ],
      },
      'diabetes': {
        parameters: ['Blood glucose', 'Symptoms of hypo/hyperglycemia'],
        frequency: 'As directed by endocrinologist',
        whenToContactDoctor: [
          'Blood glucose <70 or >400',
          'Symptoms of diabetic ketoacidosis',
          'Recurring hypoglycemia',
        ],
      },
    };

    return (
      instructions[condition.toLowerCase()] || {
        parameters: [],
        frequency: 'As directed',
        whenToContactDoctor: ['Any concerning symptoms'],
      }
    );
  }

  /**
   * Schedule follow-up visits
   */
  scheduleFollowUpVisits(
    condition: string,
  ): Array<{
    visit: number;
    timeframe: string;
    visitType: string;
    procedures: string[];
  }> {
    const schedules: {
      [key: string]: Array<{
        visit: number;
        timeframe: string;
        visitType: string;
        procedures: string[];
      }>;
    } = {
      'acute coronary syndrome': [
        {
          visit: 1,
          timeframe: '1 week',
          visitType: 'Phone',
          procedures: [],
        },
        {
          visit: 2,
          timeframe: '2-4 weeks',
          visitType: 'Office',
          procedures: ['EKG', 'Stress test planning'],
        },
        {
          visit: 3,
          timeframe: '6-8 weeks',
          visitType: 'Office',
          procedures: ['Stress test/imaging', 'Labs'],
        },
      ],
      'heart failure': [
        {
          visit: 1,
          timeframe: '1-2 weeks',
          visitType: 'Phone',
          procedures: [],
        },
        {
          visit: 2,
          timeframe: '2-4 weeks',
          visitType: 'Office',
          procedures: ['Physical exam', 'Labs', 'Echocardiography if needed'],
        },
        {
          visit: 3,
          timeframe: '2-3 months',
          visitType: 'Office',
          procedures: ['Physical exam', 'Labs'],
        },
      ],
    };

    return (
      schedules[condition.toLowerCase()] || [
        {
          visit: 1,
          timeframe: '1-2 weeks',
          visitType: 'Office',
          procedures: [],
        },
      ]
    );
  }

  /**
   * Get warning signs to monitor
   */
  getWarningSignsToMonitor(condition: string): {
    commonSigns: string[];
    redFlags: string[];
    actionNeeded: string;
  } {
    const warningMap: {
      [key: string]: {
        commonSigns: string[];
        redFlags: string[];
        actionNeeded: string;
      };
    } = {
      'heart failure': {
        commonSigns: [
          'Increased shortness of breath',
          'Weight gain',
          'Leg swelling',
          'Fatigue',
          'Palpitations',
        ],
        redFlags: [
          'Severe shortness of breath at rest',
          'Orthopnea (cannot lie flat)',
          'Confusion',
          'Chest pain',
          'Syncope',
        ],
        actionNeeded: 'Go to ER or call 911 for red flags',
      },
      'acute coronary syndrome': {
        commonSigns: [
          'Chest discomfort',
          'Dyspnea',
          'Palpitations',
        ],
        redFlags: [
          'Severe chest pain',
          'Chest pain with diaphoresis',
          'Syncope',
          'Severe dyspnea',
        ],
        actionNeeded: 'Call 911 immediately for red flags',
      },
    };

    return (
      warningMap[condition.toLowerCase()] || {
        commonSigns: [],
        redFlags: [],
        actionNeeded: 'Contact physician for any concerning symptoms',
      }
    );
  }
}
