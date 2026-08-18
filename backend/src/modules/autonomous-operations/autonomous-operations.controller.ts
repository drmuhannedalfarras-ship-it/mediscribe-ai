import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AutonomousOperationsService } from './autonomous-operations.service';
import { OrderPlacementService } from './services/order-placement.service';
import { ClinicalEscalationService } from './services/clinical-escalation.service';
import { NotificationService } from './services/notification.service';
import { RealtimeMonitoringService } from './services/realtime-monitoring.service';
import { AdvancedDecisionService } from './services/advanced-decision.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';

@ApiTags('Autonomous Operations')
@Controller('autonomous-operations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutonomousOperationsController {
  private readonly logger = new Logger(AutonomousOperationsController.name);

  constructor(
    private readonly autonomousService: AutonomousOperationsService,
    private readonly orderService: OrderPlacementService,
    private readonly escalationService: ClinicalEscalationService,
    private readonly notificationService: NotificationService,
    private readonly monitoringService: RealtimeMonitoringService,
    private readonly advancedDecisionService: AdvancedDecisionService,
  ) {}

  // ========== AUTONOMOUS PROCESSING ==========

  /**
   * Process consultation autonomously
   */
  @Post('consultations/:consultationId/process')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process consultation autonomously' })
  async processAutonomously(
    @Param('consultationId') consultationId: string,
    @Query('requireApproval') requireApproval: boolean = true,
  ) {
    try {
      const result = await this.autonomousService.processConsultationAutonomously(
        consultationId,
        requireApproval,
      );

      return {
        statusCode: 200,
        message: 'Autonomous processing initiated',
        data: result,
      };
    } catch (error: any) {
      this.logger.error(`Process autonomously error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get autonomous operation status
   */
  @Get('consultations/:consultationId/status')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get operation status' })
  async getOperationStatus(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const status = await this.autonomousService.getOperationStatus(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Operation status retrieved',
        status,
      };
    } catch (error: any) {
      this.logger.error(`Get status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve autonomous operations
   */
  @Put('consultations/:consultationId/approve')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve autonomous operations' })
  async approveOperations(
    @Param('consultationId') consultationId: string,
    @Body() body: { approvedBy: string },
  ) {
    try {
      const result = await this.autonomousService.approveAutonomousOperations(
        consultationId,
        body.approvedBy,
      );

      return {
        statusCode: 200,
        message: 'Operations approved',
        result,
      };
    } catch (error: any) {
      this.logger.error(`Approve error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject autonomous operations
   */
  @Put('consultations/:consultationId/reject')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject autonomous operations' })
  async rejectOperations(
    @Param('consultationId') consultationId: string,
    @Body() body: { rejectedBy: string; reason: string },
  ) {
    try {
      const result = await this.autonomousService.rejectAutonomousOperations(
        consultationId,
        body.rejectedBy,
        body.reason,
      );

      return {
        statusCode: 200,
        message: 'Operations rejected',
        result,
      };
    } catch (error: any) {
      this.logger.error(`Reject error: ${error.message}`);
      throw error;
    }
  }

  // ========== ORDERS ==========

  /**
   * Get pending orders
   */
  @Get('consultations/:consultationId/orders')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get pending orders' })
  async getPendingOrders(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const orders = await this.orderService.getPendingOrders(consultationId);

      return {
        statusCode: 200,
        message: 'Orders retrieved',
        orders,
      };
    } catch (error: any) {
      this.logger.error(`Get orders error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get order status
   */
  @Get('orders/:orderId/status')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get order status' })
  async getOrderStatus(
    @Param('orderId') orderId: string,
  ) {
    try {
      const status = await this.orderService.getOrderStatus(orderId);

      return {
        statusCode: 200,
        message: 'Order status retrieved',
        status,
      };
    } catch (error: any) {
      this.logger.error(`Get order status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute order
   */
  @Put('orders/:orderId/execute')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute order' })
  async executeOrder(
    @Param('orderId') orderId: string,
  ) {
    try {
      const result = await this.autonomousService.executeAutonomousOrder(
        orderId,
      );

      return {
        statusCode: 200,
        message: 'Order executed',
        result,
      };
    } catch (error: any) {
      this.logger.error(`Execute order error: ${error.message}`);
      throw error;
    }
  }

  // ========== ESCALATIONS ==========

  /**
   * Get escalations
   */
  @Get('consultations/:consultationId/escalations')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get escalations' })
  async getEscalations(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const escalations = await this.escalationService.getActiveEscalations(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Escalations retrieved',
        escalations,
      };
    } catch (error: any) {
      this.logger.error(`Get escalations error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get escalation summary
   */
  @Post('escalations/summary')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get escalation summary' })
  async getEscalationSummary(
    @Body() body: { escalations: any[] },
  ) {
    try {
      const summary = this.escalationService.getEscalationSummary(
        body.escalations,
      );

      return {
        statusCode: 200,
        message: 'Summary retrieved',
        summary,
      };
    } catch (error: any) {
      this.logger.error(`Get summary error: ${error.message}`);
      throw error;
    }
  }

  // ========== NOTIFICATIONS ==========

  /**
   * Get pending notifications
   */
  @Get('consultations/:consultationId/notifications')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get pending notifications' })
  async getNotifications(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const notifications = await this.notificationService.getPendingNotifications(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Notifications retrieved',
        notifications,
      };
    } catch (error: any) {
      this.logger.error(`Get notifications error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  @Put('notifications/:notificationId/read')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('notificationId') notificationId: string,
  ) {
    try {
      const result = await this.notificationService.markAsRead(notificationId);

      return {
        statusCode: 200,
        message: 'Notification marked as read',
        result,
      };
    } catch (error: any) {
      this.logger.error(`Mark read error: ${error.message}`);
      throw error;
    }
  }

  // ========== MONITORING ==========

  /**
   * Get active monitoring
   */
  @Get('consultations/:consultationId/monitoring')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get active monitoring' })
  async getMonitoring(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const monitoring = await this.monitoringService.getActiveMonitoring(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Monitoring retrieved',
        monitoring,
      };
    } catch (error: any) {
      this.logger.error(`Get monitoring error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get monitoring alerts
   */
  @Get('consultations/:consultationId/monitoring/alerts')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get monitoring alerts' })
  async getMonitoringAlerts(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const alerts = await this.autonomousService.getMonitoringAlerts(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Monitoring alerts retrieved',
        alerts,
      };
    } catch (error: any) {
      this.logger.error(`Get alerts error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update monitoring values
   */
  @Put('consultations/:consultationId/monitoring/update')
  @UseGuards(RolesGuard)
  @Roles('NURSE', 'PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update monitoring values' })
  async updateMonitoring(
    @Param('consultationId') consultationId: string,
    @Body() body: Record<string, any>,
  ) {
    try {
      const result = await this.monitoringService.updateMonitoringValues(
        consultationId,
        body,
      );

      return {
        statusCode: 200,
        message: 'Monitoring updated',
        result,
      };
    } catch (error: any) {
      this.logger.error(`Update monitoring error: ${error.message}`);
      throw error;
    }
  }

  // ========== ADVANCED DECISIONS ==========

  /**
   * Get advanced decisions
   */
  @Get('consultations/:consultationId/decisions')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get advanced decisions' })
  async getAdvancedDecisions(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const decisions = await this.autonomousService.getAdvancedDecisions(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Advanced decisions retrieved',
        decisions,
      };
    } catch (error: any) {
      this.logger.error(`Get decisions error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get confidence analysis
   */
  @Post('decisions/confidence-analysis')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get confidence analysis' })
  async getConfidenceAnalysis(
    @Body() body: { consultationId: string },
  ) {
    try {
      const analysis = await this.advancedDecisionService.getConfidenceAnalysis(
        body.consultationId,
      );

      return {
        statusCode: 200,
        message: 'Confidence analysis retrieved',
        analysis,
      };
    } catch (error: any) {
      this.logger.error(`Get analysis error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get outcome prediction
   */
  @Post('decisions/outcome-prediction')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Predict patient outcomes' })
  async predictOutcomes(
    @Body() body: { consultationId: string },
  ) {
    try {
      const prediction = await this.advancedDecisionService.predictPatientOutcomes(
        body.consultationId,
      );

      return {
        statusCode: 200,
        message: 'Outcome prediction retrieved',
        prediction,
      };
    } catch (error: any) {
      this.logger.error(`Prediction error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get model interpretability
   */
  @Get('decisions/model-info')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get model interpretability info' })
  async getModelInfo() {
    try {
      const info = this.advancedDecisionService.getModelInterpretability();

      return {
        statusCode: 200,
        message: 'Model info retrieved',
        info,
      };
    } catch (error: any) {
      this.logger.error(`Get model info error: ${error.message}`);
      throw error;
    }
  }
}
