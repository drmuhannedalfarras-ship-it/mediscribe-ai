import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { AllergiesService } from './services/allergies.service';
import { MedicationsService } from './services/medications.service';
import { ConditionsService } from './services/conditions.service';
import { VitalSignsService } from './services/vital-signs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import {
  CreatePatientDto,
  UpdatePatientDto,
  SearchPatientDto,
  CreateVitalSignsDto,
} from '@dto/index';
import { PatientStatus } from '@entities/patient.entity';
import { AllergySeverity } from '@entities/patient-allergy.entity';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PatientsController {
  private readonly logger = new Logger(PatientsController.name);

  constructor(
    private readonly patientsService: PatientsService,
    private readonly allergiesService: AllergiesService,
    private readonly medicationsService: MedicationsService,
    private readonly conditionsService: ConditionsService,
    private readonly vitalSignsService: VitalSignsService,
  ) {}

  /**
   * Create a new patient
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Create a new patient' })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createPatient(
    @Body() createPatientDto: CreatePatientDto,
    @CurrentUser() user: any,
  ) {
    try {
      const patient = await this.patientsService.createPatient(createPatientDto);

      this.logger.log(`Patient created by ${user.email}: ${patient.patientId}`);

      return {
        statusCode: 201,
        message: 'Patient created successfully',
        patient,
      };
    } catch (error: any) {
      this.logger.error(`Create patient error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all patients
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get all patients with pagination' })
  @ApiResponse({ status: 200, description: 'Patients retrieved' })
  async getAllPatients(
    @Query('skip') skipQuery?: string,
    @Query('take') takeQuery?: string,
    @Query('status') status?: PatientStatus,
  ) {
    try {
      const skip = skipQuery ? parseInt(skipQuery, 10) : 0;
      let take = takeQuery ? parseInt(takeQuery, 10) : 20;
      if (take > 100) {
        take = 100;
      }

      const result = await this.patientsService.getAllPatients(skip, take, status);

      return {
        statusCode: 200,
        message: 'Patients retrieved',
        data: result.data,
        pagination: {
          skip: result.skip,
          take: result.take,
          total: result.total,
        },
      };
    } catch (error: any) {
      this.logger.error(`Get patients error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search patients
   */
  @Get('search')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Search patients by various criteria' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchPatients(@Query() searchDto: SearchPatientDto) {
    try {
      if (!searchDto.mrn && !searchDto.firstName && !searchDto.lastName &&
          !searchDto.email && !searchDto.phoneNumber) {
        throw new BadRequestException(
          'At least one search criterion is required',
        );
      }

      const result = await this.patientsService.searchPatients(searchDto);

      return {
        statusCode: 200,
        message: 'Search results',
        data: result.data,
        pagination: {
          skip: searchDto.skip || 0,
          take: searchDto.take || 20,
          total: result.total,
        },
      };
    } catch (error: any) {
      this.logger.error(`Search patients error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get patient by ID
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get patient details by ID' })
  @ApiResponse({ status: 200, description: 'Patient details retrieved' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async getPatient(@Param('id') patientId: string) {
    try {
      const patient = await this.patientsService.getPatientById(patientId);

      return {
        statusCode: 200,
        message: 'Patient details retrieved',
        patient,
      };
    } catch (error: any) {
      this.logger.error(`Get patient error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update patient information
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update patient information' })
  @ApiResponse({ status: 200, description: 'Patient updated' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  async updatePatient(
    @Param('id') patientId: string,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentUser() user: any,
  ) {
    try {
      const patient = await this.patientsService.updatePatient(
        patientId,
        updatePatientDto,
      );

      this.logger.log(`Patient updated by ${user.email}: ${patientId}`);

      return {
        statusCode: 200,
        message: 'Patient updated',
        patient,
      };
    } catch (error: any) {
      this.logger.error(`Update patient error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete patient (soft delete)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete patient (soft delete)' })
  @ApiResponse({ status: 200, description: 'Patient deleted' })
  async deletePatient(
    @Param('id') patientId: string,
    @CurrentUser() user: any,
  ) {
    try {
      await this.patientsService.deletePatient(patientId);

      this.logger.log(`Patient deleted by ${user.email}: ${patientId}`);

      return {
        statusCode: 200,
        message: 'Patient deleted',
      };
    } catch (error: any) {
      this.logger.error(`Delete patient error: ${error.message}`);
      throw error;
    }
  }

  // ========== ALLERGIES ENDPOINTS ==========

  /**
   * Add allergy to patient
   */
  @Post(':patientId/allergies')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Add allergy to patient' })
  async addAllergy(
    @Param('patientId') patientId: string,
    @Body() body: { allergen: string; severity: AllergySeverity; reaction?: string },
  ) {
    try {
      const allergy = await this.allergiesService.addAllergy(
        patientId,
        body.allergen,
        body.severity,
        body.reaction,
      );

      return {
        statusCode: 201,
        message: 'Allergy added',
        allergy,
      };
    } catch (error: any) {
      this.logger.error(`Add allergy error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get patient allergies
   */
  @Get(':patientId/allergies')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get patient allergies' })
  async getPatientAllergies(@Param('patientId') patientId: string) {
    try {
      const allergies = await this.allergiesService.getPatientAllergies(patientId);

      return {
        statusCode: 200,
        message: 'Allergies retrieved',
        allergies,
      };
    } catch (error: any) {
      this.logger.error(`Get allergies error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove allergy
   */
  @Delete(':patientId/allergies/:allergyId')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove allergy from patient' })
  async removeAllergy(
    @Param('patientId') patientId: string,
    @Param('allergyId') allergyId: string,
  ) {
    try {
      await this.allergiesService.removeAllergy(allergyId, patientId);

      return {
        statusCode: 200,
        message: 'Allergy removed',
      };
    } catch (error: any) {
      this.logger.error(`Remove allergy error: ${error.message}`);
      throw error;
    }
  }

  // ========== MEDICATIONS ENDPOINTS ==========

  /**
   * Add medication to patient
   */
  @Post(':patientId/medications')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add medication to patient' })
  async addMedication(
    @Param('patientId') patientId: string,
    @Body()
    body: {
      medicationName: string;
      dose?: string;
      frequency?: string;
      indication?: string;
    },
  ) {
    try {
      const medication = await this.medicationsService.addMedication(
        patientId,
        body.medicationName,
        body.dose,
        body.frequency,
        body.indication,
      );

      return {
        statusCode: 201,
        message: 'Medication added',
        medication,
      };
    } catch (error: any) {
      this.logger.error(`Add medication error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active medications for patient
   */
  @Get(':patientId/medications/active')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get active medications for patient' })
  async getActiveMedications(@Param('patientId') patientId: string) {
    try {
      const medications =
        await this.medicationsService.getActivePatientMedications(patientId);

      return {
        statusCode: 200,
        message: 'Active medications retrieved',
        medications,
      };
    } catch (error: any) {
      this.logger.error(`Get active medications error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all medications for patient
   */
  @Get(':patientId/medications')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get all medications for patient (including discontinued)' })
  async getPatientMedications(@Param('patientId') patientId: string) {
    try {
      const medications = await this.medicationsService.getPatientMedications(
        patientId,
      );

      return {
        statusCode: 200,
        message: 'Medications retrieved',
        medications,
      };
    } catch (error: any) {
      this.logger.error(`Get medications error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Discontinue medication
   */
  @Put(':patientId/medications/:medicationId/discontinue')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discontinue medication' })
  async discontinueMedication(
    @Param('patientId') patientId: string,
    @Param('medicationId') medicationId: string,
  ) {
    try {
      const medication = await this.medicationsService.discontinueMedication(
        medicationId,
        patientId,
      );

      return {
        statusCode: 200,
        message: 'Medication discontinued',
        medication,
      };
    } catch (error: any) {
      this.logger.error(`Discontinue medication error: ${error.message}`);
      throw error;
    }
  }

  // ========== CONDITIONS ENDPOINTS ==========

  /**
   * Add condition to patient
   */
  @Post(':patientId/conditions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add condition/diagnosis to patient' })
  async addCondition(
    @Param('patientId') patientId: string,
    @Body()
    body: {
      conditionName: string;
      icdCode?: string;
      severity?: string;
    },
  ) {
    try {
      const condition = await this.conditionsService.addCondition(
        patientId,
        body.conditionName,
        body.icdCode,
        body.severity,
      );

      return {
        statusCode: 201,
        message: 'Condition added',
        condition,
      };
    } catch (error: any) {
      this.logger.error(`Add condition error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active conditions for patient
   */
  @Get(':patientId/conditions/active')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get active conditions for patient' })
  async getActiveConditions(@Param('patientId') patientId: string) {
    try {
      const conditions = await this.conditionsService.getActivePatientConditions(
        patientId,
      );

      return {
        statusCode: 200,
        message: 'Active conditions retrieved',
        conditions,
      };
    } catch (error: any) {
      this.logger.error(`Get active conditions error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all conditions for patient
   */
  @Get(':patientId/conditions')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get all conditions for patient (including resolved)' })
  async getPatientConditions(@Param('patientId') patientId: string) {
    try {
      const conditions = await this.conditionsService.getPatientConditions(
        patientId,
      );

      return {
        statusCode: 200,
        message: 'Conditions retrieved',
        conditions,
      };
    } catch (error: any) {
      this.logger.error(`Get conditions error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resolve condition
   */
  @Put(':patientId/conditions/:conditionId/resolve')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark condition as resolved' })
  async resolveCondition(
    @Param('patientId') patientId: string,
    @Param('conditionId') conditionId: string,
  ) {
    try {
      const condition = await this.conditionsService.resolveCondition(
        conditionId,
        patientId,
      );

      return {
        statusCode: 200,
        message: 'Condition resolved',
        condition,
      };
    } catch (error: any) {
      this.logger.error(`Resolve condition error: ${error.message}`);
      throw error;
    }
  }

  // ========== VITAL SIGNS ENDPOINTS ==========

  /**
   * Record vital signs
   */
  @Post(':patientId/vital-signs')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'NURSE', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Record vital signs for patient' })
  async recordVitalSigns(
    @Param('patientId') patientId: string,
    @Body() createVitalSignsDto: CreateVitalSignsDto,
    @CurrentUser() user: any,
  ) {
    try {
      const vitalSigns = await this.vitalSignsService.recordVitalSigns(
        patientId,
        createVitalSignsDto,
        user.id,
      );

      const abnormalities =
        this.vitalSignsService.checkForAbnormalities(vitalSigns);

      return {
        statusCode: 201,
        message: 'Vital signs recorded',
        vitalSigns,
        abnormalities,
      };
    } catch (error: any) {
      this.logger.error(`Record vital signs error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get latest vital signs
   */
  @Get(':patientId/vital-signs/latest')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'NURSE', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get latest vital signs for patient' })
  async getLatestVitalSigns(@Param('patientId') patientId: string) {
    try {
      const vitalSigns = await this.vitalSignsService.getLatestVitalSigns(
        patientId,
      );

      if (!vitalSigns) {
        return {
          statusCode: 200,
          message: 'No vital signs recorded',
          vitalSigns: null,
        };
      }

      const abnormalities =
        this.vitalSignsService.checkForAbnormalities(vitalSigns);

      return {
        statusCode: 200,
        message: 'Latest vital signs retrieved',
        vitalSigns,
        abnormalities,
      };
    } catch (error: any) {
      this.logger.error(`Get latest vital signs error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vital signs history
   */
  @Get(':patientId/vital-signs/history')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'NURSE', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get vital signs history for patient' })
  async getVitalSignsHistory(
    @Param('patientId') patientId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
  ) {
    try {
      const result = await this.vitalSignsService.getVitalSignsHistory(
        patientId,
        skip,
        take,
      );

      return {
        statusCode: 200,
        message: 'Vital signs history retrieved',
        data: result.data,
        pagination: {
          skip,
          take,
          total: result.total,
        },
      };
    } catch (error: any) {
      this.logger.error(`Get vital signs history error: ${error.message}`);
      throw error;
    }
  }
}
