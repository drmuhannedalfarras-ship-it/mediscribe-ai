import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';

export interface MonitoringParameter {
  name: string;
  currentValue?: any;
  targetValue?: any;
  threshold: {
    min?: number;
    max?: number;
  };
  frequency: string;
  unit: string;
  status: 'normal' | 'warning' | 'alert';
}

export interface RealtimeMonitor {
  consultationId: string;
  active: boolean;
  parameters: MonitoringParameter[];
  alerts: any[];
  lastUpdate: Date;
  nextCheckTime: Date;
}

@Injectable()
export class RealtimeMonitoringService {
  private readonly logger = new Logger(RealtimeMonitoringService.name);

  // Monitoring storage
  private monitors: Map<string, RealtimeMonitor> = new Map();

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
  ) {}

  /**
   * Setup realtime monitoring for consultation
   */
  async setupRealtimeMonitoring(consultationId: string): Promise<MonitoringParameter[]> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Define monitoring parameters based on condition
    // In production, would extract from clinical note
    const parameters: MonitoringParameter[] = [
      {
        name: 'Blood Pressure',
        currentValue: null,
        targetValue: '<130/80',
        threshold: {
          min: 90,
          max: 180,
        },
        frequency: 'Every 4 hours',
        unit: 'mmHg',
        status: 'normal',
      },
      {
        name: 'Heart Rate',
        currentValue: null,
        targetValue: '60-100',
        threshold: {
          min: 40,
          max: 120,
        },
        frequency: 'Every 4 hours',
        unit: 'bpm',
        status: 'normal',
      },
      {
        name: 'Oxygen Saturation',
        currentValue: null,
        targetValue: '>94%',
        threshold: {
          min: 92,
          max: 100,
        },
        frequency: 'Every 2 hours',
        unit: '%',
        status: 'normal',
      },
      {
        name: 'Temperature',
        currentValue: null,
        targetValue: '98.6°F',
        threshold: {
          min: 97,
          max: 103,
        },
        frequency: 'Every 8 hours',
        unit: '°F',
        status: 'normal',
      },
      {
        name: 'Respiratory Rate',
        currentValue: null,
        targetValue: '12-20',
        threshold: {
          min: 8,
          max: 30,
        },
        frequency: 'Every 4 hours',
        unit: 'breaths/min',
        status: 'normal',
      },
    ];

    const monitor: RealtimeMonitor = {
      consultationId,
      active: true,
      parameters,
      alerts: [],
      lastUpdate: new Date(),
      nextCheckTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
    };

    this.monitors.set(consultationId, monitor);

    this.logger.log(
      `Realtime monitoring setup: ${consultationId} (${parameters.length} parameters)`,
    );

    return parameters;
  }

  /**
   * Update monitoring values
   */
  async updateMonitoringValues(
    consultationId: string,
    values: Record<string, any>,
  ): Promise<{
    updated: boolean;
    alerts: any[];
  }> {
    const monitor = this.monitors.get(consultationId);

    if (!monitor) {
      throw new NotFoundException(
        `Monitor not found for consultation: ${consultationId}`,
      );
    }

    const newAlerts = [];

    // Update parameters with new values
    for (const parameter of monitor.parameters) {
      if (values[parameter.name]) {
        parameter.currentValue = values[parameter.name];

        // Check thresholds
        const alert = this.checkThreshold(parameter);
        if (alert) {
          newAlerts.push(alert);
          parameter.status = 'alert';
        } else {
          parameter.status = 'normal';
        }
      }
    }

    monitor.lastUpdate = new Date();
    monitor.alerts = newAlerts;

    this.logger.log(
      `Updated monitoring: ${consultationId} (${newAlerts.length} alerts)`,
    );

    return {
      updated: true,
      alerts: newAlerts,
    };
  }

  /**
   * Check parameter against threshold
   */
  private checkThreshold(parameter: MonitoringParameter): any {
    const value = parameter.currentValue;

    if (typeof value !== 'number') {
      return null;
    }

    if (
      (parameter.threshold.min && value < parameter.threshold.min) ||
      (parameter.threshold.max && value > parameter.threshold.max)
    ) {
      return {
        parameter: parameter.name,
        currentValue: value,
        threshold: parameter.threshold,
        severity: 'alert',
        timestamp: new Date(),
      };
    }

    return null;
  }

  /**
   * Get active monitoring
   */
  async getActiveMonitoring(consultationId: string): Promise<MonitoringParameter[]> {
    const monitor = this.monitors.get(consultationId);

    if (!monitor || !monitor.active) {
      return [];
    }

    return monitor.parameters;
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(consultationId: string): Promise<any[]> {
    const monitor = this.monitors.get(consultationId);

    if (!monitor) {
      return [];
    }

    return monitor.alerts;
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(consultationId: string): Promise<boolean> {
    const monitor = this.monitors.get(consultationId);

    if (!monitor) {
      return false;
    }

    monitor.active = false;

    this.logger.log(`Monitoring stopped: ${consultationId}`);

    return true;
  }

  /**
   * Get monitoring summary
   */
  async getMonitoringSummary(consultationId: string): Promise<{
    active: boolean;
    parametersMonitored: number;
    activeAlerts: number;
    lastUpdate: Date;
    parametersStatus: Record<string, string>;
  }> {
    const monitor = this.monitors.get(consultationId);

    if (!monitor) {
      return {
        active: false,
        parametersMonitored: 0,
        activeAlerts: 0,
        lastUpdate: new Date(),
        parametersStatus: {},
      };
    }

    const parametersStatus: Record<string, string> = {};
    monitor.parameters.forEach((p) => {
      parametersStatus[p.name] = p.status;
    });

    return {
      active: monitor.active,
      parametersMonitored: monitor.parameters.length,
      activeAlerts: monitor.alerts.length,
      lastUpdate: monitor.lastUpdate,
      parametersStatus,
    };
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis(consultationId: string, parameter: string): Promise<{
    parameter: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercentage: number;
    recommendation: string;
  }> {
    const monitor = this.monitors.get(consultationId);

    if (!monitor) {
      throw new NotFoundException(
        `Monitor not found: ${consultationId}`,
      );
    }

    const param = monitor.parameters.find((p) => p.name === parameter);

    if (!param) {
      throw new NotFoundException(`Parameter not found: ${parameter}`);
    }

    // In production, would analyze historical data
    return {
      parameter,
      trend: 'stable',
      changePercentage: 0,
      recommendation: `Continue monitoring ${parameter} closely.`,
    };
  }

  /**
   * Create automated alert rules
   */
  createAlertRules(consultationId: string): any[] {
    const monitor = this.monitors.get(consultationId);

    if (!monitor) {
      return [];
    }

    const rules: any[] = [];

    monitor.parameters.forEach((param) => {
      rules.push({
        parameter: param.name,
        rule: `Alert if ${param.name} ${param.threshold.min ? `< ${param.threshold.min}` : ''} or ${param.threshold.max ? `> ${param.threshold.max}` : ''}`,
        action: 'Send alert to healthcare provider',
        enabled: true,
      });
    });

    return rules;
  }

  /**
   * Get monitoring report
   */
  async getMonitoringReport(consultationId: string): Promise<{
    consultationId: string;
    reportDate: Date;
    activeParameters: number;
    totalAlerts: number;
    parametersStatus: Record<string, string>;
    recommendations: string[];
  }> {
    const monitor = this.monitors.get(consultationId);

    if (!monitor) {
      throw new NotFoundException(
        `Monitor not found: ${consultationId}`,
      );
    }

    const recommendations: string[] = [];

    monitor.parameters.forEach((param) => {
      if (param.status === 'alert') {
        recommendations.push(
          `Review ${param.name}: current value ${param.currentValue}`,
        );
      }
    });

    const parametersStatus: Record<string, string> = {};
    monitor.parameters.forEach((p) => {
      parametersStatus[p.name] = p.status;
    });

    return {
      consultationId,
      reportDate: new Date(),
      activeParameters: monitor.parameters.length,
      totalAlerts: monitor.alerts.length,
      parametersStatus,
      recommendations,
    };
  }
}
