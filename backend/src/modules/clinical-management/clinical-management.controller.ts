import {
  Controller,
  Get,
  Post,
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
import { ClinicalManagementService } from './clinical-management.service';
import { MedicationManagementService } from './services/medication-management.service';
import { TreatmentPlanningService } from './services/treatment-planning.service';
import { MonitoringAndFollowUpService } from './services/monitoring-and-follow-up.service';
import { MedicationSafetyService } from './services/medication-safety.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';

@ApiTags('Clinical Management')
@Controller('clinical-management')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClinicalManagementController {
  private readonly logger = new Logger(ClinicalManagementController.name);

  constructor(
    private readonly clinicalManagementService: ClinicalManagementService,
    private readonly medicationService: MedicationManagementService,
    private readonly treatmentService: TreatmentPlanningService,
    private readonly monitoringService: MonitoringAndFollowUpService,
    private readonly safetyService: MedicationSafetyService,
  ) {}

  // ========== COMPREHENSIVE MANAGEMENT ==========

  /**
   * Get comprehensive management plan
   */
  @Get('consultations/:consultationId/comprehensive')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get comprehensive management plan' })
  async getComprehensiveManagementPlan(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const plan = await this.clinicalManagementService.getComprehensiveManagementPlan(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Comprehensive management plan retrieved',
        data: plan,
      };
    } catch (error: any) {
      this.logger.error(`Get management plan error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get filtered management plan
   */
  @Get('consultations/:consultationId/plan')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get filtered management plan' })
  async getManagementFiltered(
    @Param('consultationId') consultationId: string,
    @Query('filter')
    filter?: 'treatment' | 'medications' | 'monitoring' | 'safety' | 'follow_up',
  ) {
    try {
      const plan = await this.clinicalManagementService.getManagementFiltered(
        consultationId,
        filter,
      );

      return {
        statusCode: 200,
        message: 'Management plan retrieved',
        data: plan,
      };
    } catch (error: any) {
      this.logger.error(`Get filtered plan error: ${error.message}`);
      throw error;
    }
  }

  // ========== TREATMENT PLANNING ==========

  /**
   * Get treatment plan
   */
  @Get('consultations/:consultationId/treatment-plan')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get treatment plan' })
  async getTreatmentPlan(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const plan = await this.clinicalManagementService.getTreatmentPlan(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Treatment plan retrieved',
        plan,
      };
    } catch (error: any) {
      this.logger.error(`Get treatment plan error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get discharge planning
   */
  @Post('discharge-plan')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get discharge planning' })
  async getDischargePlan(
    @Body() body: { condition: string },
  ) {
    try {
      const plan = this.treatmentService.getDischargePlan(body.condition);

      return {
        statusCode: 200,
        message: 'Discharge plan retrieved',
        plan,
      };
    } catch (error: any) {
      this.logger.error(`Get discharge plan error: ${error.message}`);
      throw error;
    }
  }

  // ========== MEDICATIONS ==========

  /**
   * Get medication recommendations
   */
  @Get('consultations/:consultationId/medications')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get medication recommendations' })
  async getMedicationRecommendations(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const medications =
        await this.clinicalManagementService.getMedicationRecommendations(
          consultationId,
        );

      return {
        statusCode: 200,
        message: 'Medication recommendations retrieved',
        medications,
      };
    } catch (error: any) {
      this.logger.error(
        `Get medications error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Create medication order
   */
  @Post('medications/order')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create medication order' })
  async createMedicationOrder(
    @Body()
    body: {
      patientId: string;
      consultationId: string;
      medicationName: string;
      dose: string;
      route: string;
      frequency: string;
      duration?: string;
      indication: string;
    },
  ) {
    try {
      const medication = await this.medicationService.createMedicationOrder(
        body.patientId,
        body.consultationId,
        {
          medicationName: body.medicationName,
          dose: body.dose,
          route: body.route,
          frequency: body.frequency,
          duration: body.duration,
          indication: body.indication,
        },
      );

      return {
        statusCode: 201,
        message: 'Medication order created',
        medication,
      };
    } catch (error: any) {
      this.logger.error(`Create medication order error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get medication alternatives
   */
  @Post('medications/alternatives')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get medication alternatives' })
  async getMedicationAlternatives(
    @Body() body: { medication: string },
  ) {
    try {
      const alternatives = this.medicationService.getAlternativeMedications(
        body.medication,
      );

      return {
        statusCode: 200,
        message: 'Alternatives retrieved',
        alternatives,
      };
    } catch (error: any) {
      this.logger.error(`Get alternatives error: ${error.message}`);
      throw error;
    }
  }

  // ========== MONITORING & FOLLOW-UP ==========

  /**
   * Get monitoring plan
   */
  @Get('consultations/:consultationId/monitoring')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get monitoring plan' })
  async getMonitoringPlan(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const plan = await this.monitoringService.getMonitoringPlan(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Monitoring plan retrieved',
        plan,
      };
    } catch (error: any) {
      this.logger.error(`Get monitoring plan error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get follow-up plan
   */
  @Get('consultations/:consultationId/follow-up')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get follow-up plan' })
  async getFollowUpPlan(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const plan = await this.monitoringService.getFollowUpPlan(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Follow-up plan retrieved',
        plan,
      };
    } catch (error: any) {
      this.logger.error(`Get follow-up plan error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get monitoring and follow-up combined
   */
  @Get('consultations/:consultationId/monitoring-and-follow-up')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get monitoring and follow-up plan' })
  async getMonitoringAndFollowUp(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const plan = await this.clinicalManagementService.getMonitoringAndFollowUpPlan(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Monitoring and follow-up plan retrieved',
        plan,
      };
    } catch (error: any) {
      this.logger.error(
        `Get monitoring and follow-up error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get next follow-up appointment
   */
  @Post('next-follow-up')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get next follow-up appointment' })
  async getNextFollowUp(
    @Body() body: { condition: string },
  ) {
    try {
      const followUp = this.monitoringService.getNextFollowUpAppointment(
        body.condition,
      );

      return {
        statusCode: 200,
        message: 'Next follow-up appointment retrieved',
        followUp,
      };
    } catch (error: any) {
      this.logger.error(`Get next follow-up error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get home monitoring instructions
   */
  @Post('home-monitoring')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get home monitoring instructions' })
  async getHomeMonitoringInstructions(
    @Body() body: { condition: string },
  ) {
    try {
      const instructions = this.monitoringService.getHomeMonitoringInstructions(
        body.condition,
      );

      return {
        statusCode: 200,
        message: 'Home monitoring instructions retrieved',
        instructions,
      };
    } catch (error: any) {
      this.logger.error(
        `Get home monitoring instructions error: ${error.message}`,
      );
      throw error;
    }
  }

  // ========== SAFETY ==========

  /**
   * Check medication safety
   */
  @Get('consultations/:consultationId/medication-safety')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Check medication safety' })
  async checkMedicationSafety(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const safety = await this.clinicalManagementService.checkMedicationSafety(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Medication safety check complete',
        safety,
      };
    } catch (error: any) {
      this.logger.error(`Check safety error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check specific medication for allergies
   */
  @Post('medications/allergy-check')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check medication for allergies' })
  async checkMedicationForAllergy(
    @Body() body: { patientId: string; medication: string },
  ) {
    try {
      const result = await this.safetyService.checkMedicationForAllergy(
        body.patientId,
        body.medication,
      );

      return {
        statusCode: 200,
        message: 'Allergy check complete',
        result,
      };
    } catch (error: any) {
      this.logger.error(`Check allergy error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get safe alternatives
   */
  @Post('medications/safe-alternatives')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get safe alternatives' })
  async getSafeAlternatives(
    @Body() body: { medication: string },
  ) {
    try {
      const alternatives = this.safetyService.suggestSafeAlternatives(
        body.medication,
      );

      return {
        statusCode: 200,
        message: 'Safe alternatives retrieved',
        alternatives,
      };
    } catch (error: any) {
      this.logger.error(`Get safe alternatives error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get medication safety education
   */
  @Post('medications/safety-education')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get medication safety education' })
  async getMedicationSafetyEducation(
    @Body() body: { medication: string },
  ) {
    try {
      const education = this.safetyService.getMedicationSafetyEducation(
        body.medication,
      );

      return {
        statusCode: 200,
        message: 'Medication safety education retrieved',
        education,
      };
    } catch (error: any) {
      this.logger.error(`Get education error: ${error.message}`);
      throw error;
    }
  }
}
