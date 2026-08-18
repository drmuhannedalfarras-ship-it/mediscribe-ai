import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  PORTAL = 'PORTAL',
}

export enum NotificationType {
  ORDER = 'ORDER',
  ESCALATION = 'ESCALATION',
  MONITORING = 'MONITORING',
  FOLLOW_UP = 'FOLLOW_UP',
  ALERT = 'ALERT',
  APPROVAL = 'APPROVAL',
}

export interface Notification {
  id: string;
  consultationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  message: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'pending' | 'sent' | 'failed' | 'read';
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
  delay?: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // Notification storage (in production, would be database)
  private notifications: Map<string, Notification> = new Map();

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
  ) {}

  /**
   * Prepare notifications for orders and escalations
   */
  async prepareNotifications(
    consultationId: string,
    orders: any[],
    escalations: any[],
  ): Promise<Notification[]> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
      relations: ['patient'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    const notifications: Notification[] = [];

    // Notifications for orders
    if (orders.length > 0) {
      const orderNotification = this.createOrderNotification(
        consultationId,
        orders,
        consultation,
      );
      notifications.push(orderNotification);
    }

    // Notifications for escalations
    if (escalations.length > 0) {
      const criticalEscalations = escalations.filter(
        (e) => e.level === 'CRITICAL',
      );
      const highEscalations = escalations.filter((e) => e.level === 'HIGH');

      if (criticalEscalations.length > 0) {
        const criticalNotification = this.createEscalationNotification(
          consultationId,
          criticalEscalations,
          'CRITICAL',
          consultation,
        );
        notifications.push(criticalNotification);
      }

      if (highEscalations.length > 0) {
        const highNotification = this.createEscalationNotification(
          consultationId,
          highEscalations,
          'HIGH',
          consultation,
        );
        notifications.push(highNotification);
      }
    }

    // Store notifications
    for (const notification of notifications) {
      this.notifications.set(notification.id, notification);
    }

    this.logger.log(
      `Prepared ${notifications.length} notifications: ${consultationId}`,
    );

    return notifications;
  }

  /**
   * Create order notification
   */
  private createOrderNotification(
    consultationId: string,
    orders: any[],
    consultation: any,
  ): Notification {
    const id = this.generateNotificationId();

    return {
      id,
      consultationId,
      type: NotificationType.ORDER,
      channel: NotificationChannel.EMAIL,
      recipient: consultation.patient?.email || 'patient@example.com',
      subject: `Medication Orders - ${consultation.patient?.fullName || 'Patient'}`,
      message: `${orders.length} medication order(s) generated from consultation. Awaiting physician approval.`,
      priority: 'high',
      status: 'pending',
      createdAt: new Date(),
    };
  }

  /**
   * Create escalation notification
   */
  private createEscalationNotification(
    consultationId: string,
    escalations: any[],
    level: string,
    consultation: any,
  ): Notification {
    const id = this.generateNotificationId();

    return {
      id,
      consultationId,
      type: NotificationType.ESCALATION,
      channel:
        level === 'CRITICAL'
          ? NotificationChannel.SMS
          : NotificationChannel.EMAIL,
      recipient:
        level === 'CRITICAL'
          ? consultation.patient?.phone || '+1-000-0000'
          : consultation.patient?.email || 'patient@example.com',
      subject: `${level} Escalation Alert - ${consultation.patient?.fullName || 'Patient'}`,
      message: `${level}-level escalation triggered. ${escalations.length} alert(s). Immediate action may be required.`,
      priority: level === 'CRITICAL' ? 'critical' : 'high',
      status: 'pending',
      createdAt: new Date(),
      delay: level === 'CRITICAL' ? 0 : 5000, // Immediate for critical
    };
  }

  /**
   * Send approved notifications
   */
  async sendApprovedNotifications(consultationId: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values()).filter(
      (n) => n.consultationId === consultationId && n.status === 'pending',
    );

    for (const notification of notifications) {
      await this.sendNotification(notification);
    }

    return notifications;
  }

  /**
   * Send single notification (integration point)
   */
  private async sendNotification(notification: Notification): Promise<void> {
    try {
      // In production, would:
      // 1. Send via selected channel (email, SMS, push, etc.)
      // 2. Handle delivery confirmation
      // 3. Implement retry logic
      // 4. Log delivery status

      notification.status = 'sent';
      notification.sentAt = new Date();

      this.logger.log(
        `Notification sent: ${notification.id} via ${notification.channel}`,
      );
    } catch (error: any) {
      notification.status = 'failed';
      this.logger.error(
        `Notification send failed: ${notification.id} - ${error.message}`,
      );
    }
  }

  /**
   * Get pending notifications
   */
  async getPendingNotifications(consultationId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(
      (n) =>
        n.consultationId === consultationId && n.status === 'pending',
    );
  }

  /**
   * Send rejection notification
   */
  async sendRejectionNotification(
    consultationId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<Notification> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
      relations: ['patient'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    const id = this.generateNotificationId();
    const notification: Notification = {
      id,
      consultationId,
      type: NotificationType.APPROVAL,
      channel: NotificationChannel.EMAIL,
      recipient: consultation.patient?.email || 'patient@example.com',
      subject: `Autonomous Operations Rejected - ${consultation.patient?.fullName || 'Patient'}`,
      message: `Autonomous operations rejected by ${rejectedBy}. Reason: ${reason}. Manual review required.`,
      priority: 'high',
      status: 'pending',
      createdAt: new Date(),
    };

    this.notifications.set(id, notification);
    await this.sendNotification(notification);

    return notification;
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(notificationId: string): Promise<Notification> {
    const notification = this.notifications.get(notificationId);

    if (!notification) {
      throw new NotFoundException(`Notification not found: ${notificationId}`);
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = this.notifications.get(notificationId);

    if (!notification) {
      throw new NotFoundException(`Notification not found: ${notificationId}`);
    }

    notification.status = 'read';
    notification.readAt = new Date();

    return notification;
  }

  /**
   * Get notification summary
   */
  async getNotificationSummary(consultationId: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    by_type: Record<string, number>;
  }> {
    const notifications = Array.from(this.notifications.values()).filter(
      (n) => n.consultationId === consultationId,
    );

    const byType: Record<string, number> = {};
    notifications.forEach((n) => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    return {
      total: notifications.length,
      pending: notifications.filter((n) => n.status === 'pending').length,
      sent: notifications.filter((n) => n.status === 'sent').length,
      failed: notifications.filter((n) => n.status === 'failed').length,
      by_type: byType,
    };
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `NOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create monitoring alert notification
   */
  createMonitoringAlert(
    consultationId: string,
    parameter: string,
    value: any,
    threshold: any,
  ): Notification {
    const id = this.generateNotificationId();

    return {
      id,
      consultationId,
      type: NotificationType.MONITORING,
      channel: NotificationChannel.PUSH,
      recipient: 'healthcare_provider',
      subject: `Monitoring Alert: ${parameter}`,
      message: `${parameter} alert: Current value ${value} exceeds threshold ${threshold}.`,
      priority: 'high',
      status: 'pending',
      createdAt: new Date(),
    };
  }
}
