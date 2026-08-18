import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';
import { Patient } from '@entities/patient.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PLACED = 'PLACED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export interface MedicationOrder {
  id: string;
  consultationId: string;
  patientId: string;
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  duration?: string;
  indication: string;
  status: OrderStatus;
  createdAt: Date;
  approvedAt?: Date;
  placedAt?: Date;
  approvedBy?: string;
  placedBy?: string;
}

@Injectable()
export class OrderPlacementService {
  private readonly logger = new Logger(OrderPlacementService.name);

  // Mock order storage (in production would be database)
  private orders: Map<string, MedicationOrder> = new Map();

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  /**
   * Generate autonomous medication orders from treatment plan
   */
  async generateAutonomousOrders(consultationId: string): Promise<any[]> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
      relations: ['patient', 'clinicalNote'],
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // In production, would extract from clinical note and treatment plan
    // For now, create example orders based on consultation
    const orders = [
      {
        consultationId,
        patientId: consultation.patientId,
        medicationName: 'Aspirin',
        dose: '325mg',
        route: 'PO',
        frequency: 'Once',
        indication: 'Antiplatelet therapy',
        priority: 'urgent',
      },
      {
        consultationId,
        patientId: consultation.patientId,
        medicationName: 'Lisinopril',
        dose: '10mg',
        route: 'PO',
        frequency: 'Daily',
        indication: 'ACE inhibitor',
        priority: 'high',
      },
    ];

    // Validate and create orders
    const createdOrders = [];
    for (const order of orders) {
      try {
        const validatedOrder = await this.validateOrder(order);
        const orderId = this.generateOrderId();
        
        const medicationOrder: MedicationOrder = {
          id: orderId,
          ...validatedOrder,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
        };

        this.orders.set(orderId, medicationOrder);
        createdOrders.push(medicationOrder);

        this.logger.log(
          `Order generated: ${orderId} - ${order.medicationName}`,
        );
      } catch (error: any) {
        this.logger.error(`Order generation failed: ${error.message}`);
      }
    }

    return createdOrders;
  }

  /**
   * Validate medication order
   */
  private async validateOrder(order: any): Promise<any> {
    const patient = await this.patientRepository.findOne({
      where: { id: order.patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found: ${order.patientId}`);
    }

    // Check for allergies
    // Check for interactions
    // Validate dosing
    // Check contraindications

    return order;
  }

  /**
   * Approve and place orders
   */
  async approveAndPlaceOrders(
    consultationId: string,
    approvedBy: string,
  ): Promise<MedicationOrder[]> {
    const pendingOrders = Array.from(this.orders.values()).filter(
      (o) =>
        o.consultationId === consultationId &&
        o.status === OrderStatus.PENDING,
    );

    const placedOrders = [];

    for (const order of pendingOrders) {
      order.status = OrderStatus.APPROVED;
      order.approvedAt = new Date();
      order.approvedBy = approvedBy;

      // Place the order (in production, would integrate with EHR/pharmacy)
      await this.placeOrder(order);

      order.status = OrderStatus.PLACED;
      order.placedAt = new Date();
      order.placedBy = 'SYSTEM';

      placedOrders.push(order);

      this.logger.log(`Order placed: ${order.id} - ${order.medicationName}`);
    }

    return placedOrders;
  }

  /**
   * Place individual order (EHR integration point)
   */
  private async placeOrder(order: MedicationOrder): Promise<void> {
    // In production, would:
    // 1. Send to pharmacy system
    // 2. Send to EHR
    // 3. Create medication record
    // 4. Notify pharmacy
    // 5. Generate prescription

    // For now, just log
    this.logger.log(`Placing order to pharmacy: ${order.id}`);
  }

  /**
   * Execute order (after pharmacy confirmation)
   */
  async executeOrder(orderId: string): Promise<{
    order_id: string;
    status: string;
    executed_at: Date;
  }> {
    const order = this.orders.get(orderId);

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    order.status = OrderStatus.COMPLETED;

    this.logger.log(`Order executed: ${orderId}`);

    return {
      order_id: orderId,
      status: order.status,
      executed_at: new Date(),
    };
  }

  /**
   * Get pending orders
   */
  async getPendingOrders(consultationId: string): Promise<MedicationOrder[]> {
    return Array.from(this.orders.values()).filter(
      (o) =>
        o.consultationId === consultationId &&
        (o.status === OrderStatus.PENDING || o.status === OrderStatus.APPROVED),
    );
  }

  /**
   * Cancel pending orders
   */
  async cancelPendingOrders(consultationId: string): Promise<number> {
    const ordersToCancel = Array.from(this.orders.values()).filter(
      (o) =>
        o.consultationId === consultationId &&
        o.status === OrderStatus.PENDING,
    );

    for (const order of ordersToCancel) {
      order.status = OrderStatus.CANCELLED;
    }

    this.logger.log(
      `Cancelled ${ordersToCancel.length} pending orders: ${consultationId}`,
    );

    return ordersToCancel.length;
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<MedicationOrder> {
    const order = this.orders.get(orderId);

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    return order;
  }

  /**
   * Get all orders for consultation
   */
  async getConsultationOrders(consultationId: string): Promise<MedicationOrder[]> {
    return Array.from(this.orders.values()).filter(
      (o) => o.consultationId === consultationId,
    );
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(consultationId: string): Promise<{
    total_orders: number;
    pending: number;
    approved: number;
    placed: number;
    completed: number;
    cancelled: number;
  }> {
    const orders = Array.from(this.orders.values()).filter(
      (o) => o.consultationId === consultationId,
    );

    return {
      total_orders: orders.length,
      pending: orders.filter((o) => o.status === OrderStatus.PENDING).length,
      approved: orders.filter((o) => o.status === OrderStatus.APPROVED).length,
      placed: orders.filter((o) => o.status === OrderStatus.PLACED).length,
      completed: orders.filter((o) => o.status === OrderStatus.COMPLETED)
        .length,
      cancelled: orders.filter((o) => o.status === OrderStatus.CANCELLED)
        .length,
    };
  }

  /**
   * Reject specific order
   */
  async rejectOrder(
    orderId: string,
    _rejectedBy: string,
    reason: string,
  ): Promise<MedicationOrder> {
    const order = this.orders.get(orderId);

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject order in ${order.status} status`,
      );
    }

    order.status = OrderStatus.REJECTED;

    this.logger.log(`Order rejected: ${orderId} - ${reason}`);

    return order;
  }
}
