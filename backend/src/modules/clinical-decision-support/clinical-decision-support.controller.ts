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
import { ClinicalDecisionSupportService } from './clinical-decision-support.service';
import { DifferentialDiagnosisService } from './services/differential-diagnosis.service';
import { MissingInformationService } from './services/missing-information.service';
import { InvestigationRecommendationService } from './services/investigation-recommendation.service';
import { EvidenceRetrievalService } from './services/evidence-retrieval.service';
import { RedFlagDetectionService } from './services/red-flag-detection.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';

@ApiTags('Clinical Decision Support')
@Controller('clinical-decision-support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClinicalDecisionSupportController {
  private readonly logger = new Logger(ClinicalDecisionSupportController.name);

  constructor(
    private readonly cdsService: ClinicalDecisionSupportService,
    private readonly differentialService: DifferentialDiagnosisService,
    private readonly missingInfoService: MissingInformationService,
    private readonly investigationService: InvestigationRecommendationService,
    private readonly evidenceService: EvidenceRetrievalService,
    private readonly redFlagService: RedFlagDetectionService,
  ) {}

  // ========== COMPREHENSIVE SUPPORT ==========

  /**
   * Get all clinical decision support for a consultation
   */
  @Get('consultations/:consultationId/comprehensive')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get comprehensive clinical decision support' })
  async getComprehensiveSupport(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const support = await this.cdsService.getComprehensiveSupport(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Comprehensive clinical decision support retrieved',
        data: support,
      };
    } catch (error: any) {
      this.logger.error(`Get comprehensive support error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get filtered clinical support
   */
  @Get('consultations/:consultationId/support')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get filtered clinical support' })
  async getSupportFiltered(
    @Param('consultationId') consultationId: string,
    @Query('filter')
    filter?: 'red_flags' | 'differentials' | 'investigations' | 'missing_info',
  ) {
    try {
      const support = await this.cdsService.getSupportFiltered(
        consultationId,
        filter,
      );

      return {
        statusCode: 200,
        message: 'Clinical support retrieved',
        data: support,
      };
    } catch (error: any) {
      this.logger.error(`Get support error: ${error.message}`);
      throw error;
    }
  }

  // ========== DIFFERENTIAL DIAGNOSIS ==========

  /**
   * Get differential diagnosis
   */
  @Get('consultations/:consultationId/differentials')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get differential diagnosis' })
  async getDifferentialDiagnosis(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const differentials =
        await this.cdsService.getDifferentialDiagnosis(consultationId);

      return {
        statusCode: 200,
        message: 'Differential diagnosis retrieved',
        differentials,
      };
    } catch (error: any) {
      this.logger.error(
        `Get differential diagnosis error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get differential for chief complaint
   */
  @Post('differentials/by-symptom')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get differential for specific symptom' })
  async getDifferentialBySymptom(
    @Body() body: { chiefComplaint: string },
  ) {
    try {
      const differentials =
        await this.differentialService.getDifferentialForChiefComplaint(
          body.chiefComplaint,
        );

      return {
        statusCode: 200,
        message: 'Differential diagnosis for symptom retrieved',
        differentials,
      };
    } catch (error: any) {
      this.logger.error(`Get differential error: ${error.message}`);
      throw error;
    }
  }

  // ========== MISSING INFORMATION ==========

  /**
   * Get missing clinical information
   */
  @Get('consultations/:consultationId/missing-information')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get missing clinical information' })
  async getMissingInformation(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const missing =
        await this.cdsService.getMissingInformation(consultationId);

      return {
        statusCode: 200,
        message: 'Missing information identified',
        missing,
      };
    } catch (error: any) {
      this.logger.error(`Get missing information error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get consultation completeness assessment
   */
  @Get('consultations/:consultationId/completeness')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assess consultation completeness' })
  async assessCompleteness(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const completeness =
        await this.missingInfoService.assessCompleteness(consultationId);

      return {
        statusCode: 200,
        message: 'Completeness assessment retrieved',
        completeness,
      };
    } catch (error: any) {
      this.logger.error(`Assess completeness error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get follow-up questions
   */
  @Get('consultations/:consultationId/follow-up-questions')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get follow-up questions to ask' })
  async getFollowUpQuestions(
    @Param('consultationId') consultationId: string,
    @Query('limit') limit: number = 5,
  ) {
    try {
      const questions =
        await this.missingInfoService.getFollowUpQuestions(
          consultationId,
          limit,
        );

      return {
        statusCode: 200,
        message: 'Follow-up questions retrieved',
        questions,
      };
    } catch (error: any) {
      this.logger.error(`Get follow-up questions error: ${error.message}`);
      throw error;
    }
  }

  // ========== INVESTIGATIONS ==========

  /**
   * Get investigation recommendations
   */
  @Get('consultations/:consultationId/investigations')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get investigation recommendations' })
  async getInvestigationRecommendations(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const investigations =
        await this.cdsService.getInvestigationRecommendations(consultationId);

      return {
        statusCode: 200,
        message: 'Investigation recommendations retrieved',
        investigations,
      };
    } catch (error: any) {
      this.logger.error(
        `Get investigation recommendations error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get urgent investigations only
   */
  @Get('consultations/:consultationId/investigations/urgent')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get urgent investigations only' })
  async getUrgentInvestigations(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const investigations =
        await this.investigationService.getUrgentInvestigations(consultationId);

      return {
        statusCode: 200,
        message: 'Urgent investigations retrieved',
        investigations,
      };
    } catch (error: any) {
      this.logger.error(`Get urgent investigations error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get investigation for symptom
   */
  @Post('investigations/by-symptom')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get investigations for specific symptom' })
  async getInvestigationsForSymptom(
    @Body() body: { symptom: string },
  ) {
    try {
      const investigations =
        await this.investigationService.getInvestigationsForSymptom(
          body.symptom,
        );

      return {
        statusCode: 200,
        message: 'Investigations for symptom retrieved',
        investigations,
      };
    } catch (error: any) {
      this.logger.error(
        `Get investigations for symptom error: ${error.message}`,
      );
      throw error;
    }
  }

  // ========== EVIDENCE & GUIDELINES ==========

  /**
   * Get evidence and guidelines
   */
  @Get('consultations/:consultationId/evidence')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get evidence and guidelines' })
  async getEvidence(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const evidence = await this.cdsService.getEvidence(consultationId);

      return {
        statusCode: 200,
        message: 'Evidence and guidelines retrieved',
        evidence,
      };
    } catch (error: any) {
      this.logger.error(`Get evidence error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get guidelines for diagnosis
   */
  @Post('evidence/guidelines-for-diagnosis')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get guidelines for diagnosis' })
  async getGuidelinesForDiagnosis(
    @Body() body: { diagnosis: string },
  ) {
    try {
      const guidelines =
        await this.evidenceService.getGuidelinesForDiagnosis(body.diagnosis);

      return {
        statusCode: 200,
        message: 'Guidelines retrieved',
        guidelines,
      };
    } catch (error: any) {
      this.logger.error(`Get guidelines error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get treatment recommendations
   */
  @Post('evidence/treatment-recommendations')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get treatment recommendations' })
  async getTreatmentRecommendations(
    @Body() body: { diagnosis: string },
  ) {
    try {
      const recommendations =
        await this.evidenceService.getTreatmentRecommendations(body.diagnosis);

      return {
        statusCode: 200,
        message: 'Treatment recommendations retrieved',
        recommendations,
      };
    } catch (error: any) {
      this.logger.error(
        `Get treatment recommendations error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Check drug interactions
   */
  @Post('evidence/drug-interactions')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check drug interactions' })
  async checkDrugInteractions(
    @Body() body: { medications: string[] },
  ) {
    try {
      const interactions = await this.evidenceService.checkDrugInteractions(
        body.medications,
      );

      return {
        statusCode: 200,
        message: 'Drug interactions checked',
        interactions,
      };
    } catch (error: any) {
      this.logger.error(`Check interactions error: ${error.message}`);
      throw error;
    }
  }

  // ========== RED FLAGS ==========

  /**
   * Get red flags and safety alerts
   */
  @Get('consultations/:consultationId/red-flags')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get red flags and safety alerts' })
  async getRedFlags(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const redFlags = await this.cdsService.getRedFlags(consultationId);

      return {
        statusCode: 200,
        message: 'Red flags detected',
        redFlags,
      };
    } catch (error: any) {
      this.logger.error(`Get red flags error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get critical flags only
   */
  @Get('consultations/:consultationId/critical-flags')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get critical flags only' })
  async getCriticalFlags(
    @Param('consultationId') consultationId: string,
  ) {
    try {
      const criticalFlags =
        await this.redFlagService.getCriticalFlags(consultationId);

      return {
        statusCode: 200,
        message: 'Critical flags retrieved',
        criticalFlags,
      };
    } catch (error: any) {
      this.logger.error(`Get critical flags error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check medication contraindication
   */
  @Post('red-flags/medication-contraindication')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check medication contraindication' })
  async checkMedicationContraindication(
    @Body() body: { patientId: string; medication: string },
  ) {
    try {
      const contraindication =
        await this.redFlagService.checkMedicationContraindication(
          body.patientId,
          body.medication,
        );

      return {
        statusCode: 200,
        message: 'Contraindication check complete',
        contraindication,
      };
    } catch (error: any) {
      this.logger.error(`Check contraindication error: ${error.message}`);
      throw error;
    }
  }
}
