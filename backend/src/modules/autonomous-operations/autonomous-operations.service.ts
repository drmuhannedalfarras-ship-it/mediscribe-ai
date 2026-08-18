import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Consultation } from '@entities/consultation.entity';
import { OrderPlacementService } from './services/order-placement.service';
import { ClinicalEscalationService, EscalationLevel } from './services/clinical-escalation.service';
import { NotificationService } from './services/notification.service';
import { RealtimeMonitoringService } from './services/realtime-monitoring.service';
import { AdvancedDecisionService } from './services/advanced-decision.service';

@Injectable()
export class AutonomousOperationsService {
  private readonly logger = new Logger(AutonomousOperationsService.name);

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    @InjectQueue('orders')
    private ordersQueue: Queue,
    @InjectQueue('notifications')
    private notificationsQueue: Queue,
    @InjectQueue('escalations')
    private escalationsQueue: Queue,
    @InjectQueue('monitoring')
    private monitoringQueue: Queue,
    private readonly orderService: OrderPlacementService,
    private readonly escalationService: ClinicalEscalationService,
    private readonly notificationService: NotificationService,
    private readonly monitoringService: RealtimeMonitoringService,
    private readonly advancedDecisionService: AdvancedDecisionService,
  ) {}

  /**
   * Autonomous consultation processing workflow
   */
  async processConsultationAutonomously(
    consultationId: string,
    physicianApprovalRequired: boolean = true,
  ): Promise<{
    orders: any[];
    escalations: any[];
    notifications: any[];
    monitoring: any[];
    approval_status: string;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
      relations: ['patient', 'clinicalNote'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Step 1: Generate autonomous orders
    const orders = await this.generateAutonomousOrders(consultationId);

    // Step 2: Check for escalations
    const escalations = await this.evaluateEscalations(consultationId);

    // Step 3: Send notifications
    const notifications = await this.sendAutonomousNotifications(
      consultationId,
      orders,
      escalations,
    );

    // Step 4: Setup realtime monitoring
    const monitoring = await this.setupRealtimeMonitoring(consultationId);

    // Step 5: Physician approval workflow
    const approvalStatus = physicianApprovalRequired
      ? 'PENDING_PHYSICIAN_APPROVAL'
      : 'AUTO_APPROVED';

    this.logger.log(
      `Autonomous processing initiated: ${consultationId} (${approvalStatus})`,
    );

    return {
      orders,
      escalations,
      notifications,
      monitoring,
      approval_status: approvalStatus,
    };
  }

  /**
   * Generate autonomous medication orders
   */
  private async generateAutonomousOrders(
    consultationId: string,
  ): Promise<any[]> {
    try {
      const orders = await this.orderService.generateAutonomousOrders(
        consultationId,
      );

      // Queue for processing
      for (const order of orders) {
        await this.ordersQueue.add(
          { consultationId, order },
          { attempts: 3, backoff: { type: 'fixed', delay: 5000 } },
        );
      }

      return orders;
    } catch (error: any) {
      this.logger.error(
        `Generate orders error: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Evaluate if escalation needed
   */
  private async evaluateEscalations(
    consultationId: string,
  ): Promise<any[]> {
    try {
      const escalations = await this.escalationService.evaluateEscalations(
        consultationId,
      );

      // Queue for processing
      for (const escalation of escalations) {
        if (escalation.required) {
          await this.escalationsQueue.add(
            { consultationId, escalation },
            { priority: escalation.level === EscalationLevel.CRITICAL ? 1 : 10 },
          );
        }
      }

      return escalations;
    } catch (error: any) {
      this.logger.error(`Evaluate escalations error: ${error.message}`);
      return [];
    }
  }

  /**
   * Send autonomous notifications
   */
  private async sendAutonomousNotifications(
    consultationId: string,
    orders: any[],
    escalations: any[],
  ): Promise<any[]> {
    try {
      const notifications =
        await this.notificationService.prepareNotifications(
          consultationId,
          orders,
          escalations,
        );

      // Queue for sending
      for (const notification of notifications) {
        await this.notificationsQueue.add(notification, {
          delay: notification.delay || 0,
        });
      }

      return notifications;
    } catch (error: any) {
      this.logger.error(`Send notifications error: ${error.message}`);
      return [];
    }
  }

  /**
   * Setup realtime monitoring
   */
  private async setupRealtimeMonitoring(
    consultationId: string,
  ): Promise<any[]> {
    try {
      const monitoring =
        await this.monitoringService.setupRealtimeMonitoring(consultationId);

      // Queue for monitoring
      await this.monitoringQueue.add(
        { consultationId, monitoring },
        { repeat: { every: 300000 } }, // Every 5 minutes
      );

      return monitoring;
    } catch (error: any) {
      this.logger.error(`Setup monitoring error: ${error.message}`);
      return [];
    }
  }

  /**
   * Get autonomous operation status
   */
  async getOperationStatus(consultationId: string): Promise<{
    consultation_id: string;
    status: string;
    orders: any[];
    escalations: any[];
    notifications: any[];
    monitoring: any[];
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    const orders = await this.orderService.getPendingOrders(consultationId);
    const escalations = await this.escalationService.getActiveEscalations(
      consultationId,
    );
    const notifications = await this.notificationService.getPendingNotifications(
      consultationId,
    );
    const monitoring = await this.monitoringService.getActiveMonitoring(
      consultationId,
    );

    return {
      consultation_id: consultationId,
      status:
        escalations.filter((e) => e.required).length > 0
          ? 'ESCALATED'
          : 'PROCESSING',
      orders,
      escalations,
      notifications,
      monitoring,
    };
  }

  /**
   * Approve autonomous operations
   */
  async approveAutonomousOperations(
    consultationId: string,
    approvedBy: string,
  ): Promise<{
    approved: boolean;
    orders_placed: number;
    notifications_sent: number;
    escalations_triggered: number;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    const orders = await this.orderService.approveAndPlaceOrders(
      consultationId,
      approvedBy,
    );
    const notifications = await this.notificationService.sendApprovedNotifications(
      consultationId,
    );
    const escalations = await this.escalationService.triggerApprovedEscalations(
      consultationId,
    );

    this.logger.log(
      `Autonomous operations approved: ${consultationId} by ${approvedBy}`,
    );

    return {
      approved: true,
      orders_placed: orders.length,
      notifications_sent: notifications.length,
      escalations_triggered: escalations.filter((e) => e.triggered).length,
    };
  }

  /**
   * Reject autonomous operations
   */
  async rejectAutonomousOperations(
    consultationId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<{
    rejected: boolean;
    reason: string;
    timestamp: Date;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Cancel all pending orders
    await this.orderService.cancelPendingOrders(consultationId);

    // Clear escalations
    await this.escalationService.clearEscalations(consultationId);

    // Notify physician
    await this.notificationService.sendRejectionNotification(
      consultationId,
      rejectedBy,
      reason,
    );

    this.logger.log(
      `Autonomous operations rejected: ${consultationId} by ${rejectedBy} - ${reason}`,
    );

    return {
      rejected: true,
      reason,
      timestamp: new Date(),
    };
  }

  /**
   * Get advanced decision recommendations
   */
  async getAdvancedDecisions(consultationId: string): Promise<{
    recommendations: any[];
    confidence: number;
    reasoning: string;
  }> {
    return this.advancedDecisionService.generateAdvancedDecisions(
      consultationId,
    );
  }

  /**
   * Execute autonomous order
   */
  async executeAutonomousOrder(orderId: string): Promise<{
    order_id: string;
    status: string;
    executed_at: Date;
  }> {
    return this.orderService.executeOrder(orderId);
  }

  /**
   * Get monitoring alerts
   */
  async getMonitoringAlerts(consultationId: string): Promise<any[]> {
    return this.monitoringService.getActiveAlerts(consultationId);
  }
}
