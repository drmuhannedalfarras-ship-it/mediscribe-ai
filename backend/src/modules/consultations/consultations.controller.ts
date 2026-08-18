import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import { ConsultationConsentService } from './services/consultation-consent.service';
import { AudioSessionService } from './services/audio-session.service';
import { TranscriptService } from './services/transcript.service';
import { ClinicalExtractionService } from './services/clinical-extraction.service';
import { ClinicalNotesService } from './services/clinical-notes.service';
import { AudioUploadOrchestratorService } from './services/audio-upload-orchestrator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators';
import { CreateConsultationDto, UpdateConsultationDto, UploadAudioDto } from '@dto/index';
import { ConsultationStatus } from '@entities/consultation.entity';
import { ExtractionStatus } from '@entities/clinical-extraction.entity';

const AUDIO_UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'audio');

const AUDIO_MIME_TYPES: Record<string, string> = {
  webm: 'audio/webm',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  opus: 'audio/opus',
  ogg: 'audio/ogg',
};

@ApiTags('Consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConsultationsController {
  private readonly logger = new Logger(ConsultationsController.name);

  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly consentService: ConsultationConsentService,
    private readonly audioService: AudioSessionService,
    private readonly transcriptService: TranscriptService,
    private readonly extractionService: ClinicalExtractionService,
    private readonly notesService: ClinicalNotesService,
    private readonly audioUploadOrchestrator: AudioUploadOrchestratorService,
  ) {}

  // ========== CONSULTATION ENDPOINTS ==========

  /**
   * Create a new consultation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new consultation' })
  async createConsultation(
    @Body() createConsultationDto: CreateConsultationDto,
    @CurrentUser() user: any,
  ) {
    try {
      const consultation = await this.consultationsService.createConsultation(
        createConsultationDto.patientId,
        user.id,
        createConsultationDto,
      );

      return {
        statusCode: 201,
        message: 'Consultation created',
        consultation,
      };
    } catch (error: any) {
      this.logger.error(`Create consultation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get patient consultations
   */
  @Get('patient/:patientId')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get consultations for a patient' })
  async getPatientConsultations(
    @Param('patientId') patientId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
    @Query('status') status?: ConsultationStatus,
  ) {
    try {
      const result = await this.consultationsService.getPatientConsultations(
        patientId,
        skip,
        take,
        status,
      );

      return {
        statusCode: 200,
        message: 'Patient consultations retrieved',
        data: result.data,
        pagination: {
          skip: result.skip,
          take: result.take,
          total: result.total,
        },
      };
    } catch (error: any) {
      this.logger.error(`Get patient consultations error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get physician consultations
   */
  @Get('physician/:physicianId')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get consultations for a physician' })
  async getPhysicianConsultations(
    @Param('physicianId') physicianId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
    @Query('status') status?: ConsultationStatus,
  ) {
    try {
      const result = await this.consultationsService.getPhysicianConsultations(
        physicianId,
        skip,
        take,
        status,
      );

      return {
        statusCode: 200,
        message: 'Physician consultations retrieved',
        data: result.data,
        pagination: {
          skip,
          take,
          total: result.total,
        },
      };
    } catch (error: any) {
      this.logger.error(`Get physician consultations error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get consultation details
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get consultation details' })
  async getConsultation(@Param('id') consultationId: string) {
    try {
      const consultation = await this.consultationsService.getConsultationById(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Consultation details retrieved',
        consultation,
      };
    } catch (error: any) {
      this.logger.error(`Get consultation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update consultation
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update consultation' })
  async updateConsultation(
    @Param('id') consultationId: string,
    @Body() updateConsultationDto: UpdateConsultationDto,
  ) {
    try {
      const consultation = await this.consultationsService.updateConsultation(
        consultationId,
        updateConsultationDto,
      );

      return {
        statusCode: 200,
        message: 'Consultation updated',
        consultation,
      };
    } catch (error: any) {
      this.logger.error(`Update consultation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start consultation (transition to IN_PROGRESS)
   */
  @Put(':id/start')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start consultation' })
  async startConsultation(@Param('id') consultationId: string) {
    try {
      const consultation = await this.consultationsService.transitionStatus(
        consultationId,
        ConsultationStatus.IN_PROGRESS,
      );

      return {
        statusCode: 200,
        message: 'Consultation started',
        consultation,
      };
    } catch (error: any) {
      this.logger.error(`Start consultation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel consultation
   */
  @Put(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel consultation' })
  async cancelConsultation(@Param('id') consultationId: string) {
    try {
      const consultation = await this.consultationsService.transitionStatus(
        consultationId,
        ConsultationStatus.CANCELLED,
      );

      return {
        statusCode: 200,
        message: 'Consultation cancelled',
        consultation,
      };
    } catch (error: any) {
      this.logger.error(`Cancel consultation error: ${error.message}`);
      throw error;
    }
  }

  // ========== PHYSICIAN REVIEW ENDPOINTS ==========

  /**
   * Begin physician review (transition to PHYSICIAN_REVIEW)
   */
  @Put(':id/review/begin')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Begin physician review' })
  async beginReview(@Param('id') consultationId: string) {
    try {
      const consultation = await this.consultationsService.transitionStatus(
        consultationId,
        ConsultationStatus.PHYSICIAN_REVIEW,
      );

      return {
        statusCode: 200,
        message: 'Physician review started',
        consultation,
      };
    } catch (error: any) {
      this.logger.error(`Begin review error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Finalize consultation (transition to FINALIZED)
   */
  @Put(':id/review/finalize')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize consultation' })
  async finalizeConsultation(@Param('id') consultationId: string) {
    try {
      const consultation = await this.consultationsService.transitionStatus(
        consultationId,
        ConsultationStatus.FINALIZED,
      );

      return {
        statusCode: 200,
        message: 'Consultation finalized',
        consultation,
      };
    } catch (error: any) {
      this.logger.error(`Finalize consultation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send consultation back for re-recording (transition to IN_PROGRESS, clears stale transcript)
   */
  @Put(':id/review/send-back')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send consultation back for re-recording' })
  async sendBackForRerecording(@Param('id') consultationId: string) {
    try {
      const consultation = await this.consultationsService.transitionStatus(
        consultationId,
        ConsultationStatus.IN_PROGRESS,
      );
      await this.transcriptService.deleteTranscript(consultationId);

      return {
        statusCode: 200,
        message: 'Consultation sent back for re-recording',
        consultation,
      };
    } catch (error: any) {
      this.logger.error(`Send back for re-recording error: ${error.message}`);
      throw error;
    }
  }

  // ========== CONSENT ENDPOINTS ==========

  /**
   * Request consent for consultation
   */
  @Post(':id/consent/request')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Request consent for consultation' })
  async requestConsent(
    @Param('id') consultationId: string,
    @Body() body: { consentTypes: string[] },
  ) {
    try {
      const consent = await this.consentService.requestConsent(
        consultationId,
        body.consentTypes,
      );

      return {
        statusCode: 201,
        message: 'Consent requested',
        consent,
      };
    } catch (error: any) {
      this.logger.error(`Request consent error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Grant consent
   */
  @Put(':id/consent/grant')
  @UseGuards(RolesGuard)
  @Roles('PATIENT', 'PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant consent' })
  async grantConsent(
    @Param('id') consultationId: string,
    @Body() body?: { consentDetails?: string },
  ) {
    try {
      const consent = await this.consentService.grantConsent(
        consultationId,
        body?.consentDetails,
      );

      return {
        statusCode: 200,
        message: 'Consent granted',
        consent,
      };
    } catch (error: any) {
      this.logger.error(`Grant consent error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Decline consent
   */
  @Put(':id/consent/decline')
  @UseGuards(RolesGuard)
  @Roles('PATIENT', 'PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline consent' })
  async declineConsent(
    @Param('id') consultationId: string,
    @Body() body?: { reason?: string },
  ) {
    try {
      const consent = await this.consentService.declineConsent(
        consultationId,
        body?.reason,
      );

      return {
        statusCode: 200,
        message: 'Consent declined',
        consent,
      };
    } catch (error: any) {
      this.logger.error(`Decline consent error: ${error.message}`);
      throw error;
    }
  }

  // ========== AUDIO ENDPOINTS ==========

  /**
   * Start audio recording
   */
  @Post(':id/audio/start')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Start audio recording' })
  async startRecording(@Param('id') consultationId: string) {
    try {
      // Verify consent first
      await this.consentService.verifyConsent(consultationId);

      const audioSession = await this.audioService.startRecording(consultationId);

      return {
        statusCode: 201,
        message: 'Recording started',
        audioSession,
      };
    } catch (error: any) {
      this.logger.error(`Start recording error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop audio recording
   */
  @Put(':id/audio/stop')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stop audio recording' })
  async stopRecording(
    @Param('id') consultationId: string,
    @Body() body: { audioFileUrl: string; duration: number },
  ) {
    try {
      const audioSession = await this.audioService.stopRecording(
        consultationId,
        body.audioFileUrl,
        body.duration,
      );

      return {
        statusCode: 200,
        message: 'Recording stopped',
        audioSession,
      };
    } catch (error: any) {
      this.logger.error(`Stop recording error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get audio session
   */
  @Get(':id/audio')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get audio session for consultation' })
  async getAudioSession(@Param('id') consultationId: string) {
    try {
      const audioSession = await this.audioService.getAudioSession(consultationId);

      if (!audioSession) {
        return {
          statusCode: 200,
          message: 'No audio session found',
          audioSession: null,
        };
      }

      return {
        statusCode: 200,
        message: 'Audio session retrieved',
        audioSession,
      };
    } catch (error: any) {
      this.logger.error(`Get audio session error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload the recorded audio file and run it through the transcription pipeline
   */
  @Post(':id/audio/upload')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload recorded audio and transcribe it' })
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const dir = path.join(AUDIO_UPLOAD_ROOT, req.params.id);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = (file.originalname.split('.').pop() || 'webm').toLowerCase();
          cb(null, `${uuid()}.${ext}`);
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('audio/')) {
          cb(new Error('Only audio files are accepted'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadAudio(
    @Param('id') consultationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadAudioDto,
  ) {
    try {
      const format = (file.originalname.split('.').pop() || 'webm').toLowerCase();

      const result = await this.audioUploadOrchestrator.processUpload(
        consultationId,
        file.path,
        file.size,
        format,
        body.duration,
      );

      return {
        statusCode: 200,
        message: 'Audio processed and transcribed',
        audioSession: result.audioSession,
        transcript: result.transcript,
      };
    } catch (error: any) {
      this.logger.error(`Upload audio error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stream the recorded audio file back for playback
   */
  @Get(':id/audio/file')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Download/stream the recorded audio file' })
  async getAudioFile(
    @Param('id') consultationId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const audioSession = await this.audioService.getAudioSession(consultationId);

    if (!audioSession || !audioSession.audioFileUrl || !fs.existsSync(audioSession.audioFileUrl)) {
      throw new NotFoundException('No audio recording found for this consultation');
    }

    const mimeType = AUDIO_MIME_TYPES[audioSession.audioFormat] || 'application/octet-stream';
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': 'inline',
    });

    return new StreamableFile(fs.createReadStream(audioSession.audioFileUrl));
  }

  // ========== TRANSCRIPT ENDPOINTS ==========

  /**
   * Get full transcript
   */
  @Get(':id/transcript')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get transcript for consultation' })
  async getTranscript(
    @Param('id') consultationId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
  ) {
    try {
      const result = await this.transcriptService.getTranscriptPaginated(
        consultationId,
        skip,
        take,
      );

      return {
        statusCode: 200,
        message: 'Transcript retrieved',
        data: result.data,
        pagination: {
          skip,
          take,
          total: result.total,
        },
      };
    } catch (error: any) {
      this.logger.error(`Get transcript error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get formatted transcript
   */
  @Get(':id/transcript/formatted')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN', 'NURSE')
  @ApiOperation({ summary: 'Get formatted transcript' })
  async getFormattedTranscript(@Param('id') consultationId: string) {
    try {
      const transcript = await this.transcriptService.getFormattedTranscript(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Formatted transcript retrieved',
        transcript,
      };
    } catch (error: any) {
      this.logger.error(`Get formatted transcript error: ${error.message}`);
      throw error;
    }
  }

  // ========== CLINICAL EXTRACTION ENDPOINTS ==========

  /**
   * Get clinical extractions
   */
  @Get(':id/extractions')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get clinical extractions' })
  async getExtractions(@Param('id') consultationId: string) {
    try {
      const extractions = await this.extractionService.getExtractions(
        consultationId,
      );

      return {
        statusCode: 200,
        message: 'Extractions retrieved',
        extractions,
      };
    } catch (error: any) {
      this.logger.error(`Get extractions error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update extraction
   */
  @Put(':id/extractions/:extractionId')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update clinical extraction' })
  async updateExtraction(
    @Param('id') _consultationId: string,
    @Param('extractionId') extractionId: string,
    @Body() body: { status?: ExtractionStatus; physicianModification?: string },
  ) {
    try {
      const extraction = await this.extractionService.updateExtraction(
        extractionId,
        body.status,
        body.physicianModification,
      );

      return {
        statusCode: 200,
        message: 'Extraction updated',
        extraction,
      };
    } catch (error: any) {
      this.logger.error(`Update extraction error: ${error.message}`);
      throw error;
    }
  }

  // ========== CLINICAL NOTES ENDPOINTS ==========

  /**
   * Get clinical note
   */
  @Get(':id/clinical-note')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get clinical note' })
  async getClinicalNote(@Param('id') consultationId: string) {
    try {
      const note = await this.notesService.getClinicalNote(consultationId);

      return {
        statusCode: 200,
        message: 'Clinical note retrieved',
        note,
      };
    } catch (error: any) {
      this.logger.error(`Get clinical note error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update SOAP section
   */
  @Put(':id/clinical-note/:section')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update SOAP section' })
  async updateSOAPSection(
    @Param('id') consultationId: string,
    @Param('section') section: 'subjective' | 'objective' | 'assessment' | 'plan',
    @Body() body: { content: string },
  ) {
    try {
      const note = await this.notesService.updateSOAPSection(
        consultationId,
        section,
        body.content,
      );

      return {
        statusCode: 200,
        message: 'SOAP section updated',
        note,
      };
    } catch (error: any) {
      this.logger.error(`Update SOAP section error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve clinical note
   */
  @Put(':id/clinical-note/approve')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize clinical note' })
  async approveClinicalNote(@Param('id') consultationId: string) {
    try {
      const note = await this.notesService.approveClinicalNote(consultationId);

      return {
        statusCode: 200,
        message: 'Clinical note finalized',
        note,
      };
    } catch (error: any) {
      this.logger.error(`Approve clinical note error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get clinical note stats
   */
  @Get(':id/clinical-note/stats')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get clinical note statistics' })
  async getNoteStat(@Param('id') consultationId: string) {
    try {
      const stats = await this.notesService.getNoteStats(consultationId);

      return {
        statusCode: 200,
        message: 'Note statistics retrieved',
        stats,
      };
    } catch (error: any) {
      this.logger.error(`Get note stats error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get consultation statistics
   */
  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles('PHYSICIAN', 'CLINICAL_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get consultation statistics' })
  async getConsultationStats(@Param('id') consultationId: string) {
    try {
      const consultation = await this.consultationsService.getConsultationById(
        consultationId,
      );
      const extractionStats =
        await this.extractionService.getExtractionStats(consultationId);
      const audioStats = await this.audioService.getAudioStats();
      const noteStats = await this.notesService.getNoteStats(consultationId);

      return {
        statusCode: 200,
        message: 'Consultation statistics retrieved',
        consultation: {
          id: consultation.id,
          status: consultation.status,
        },
        extractionStats,
        audioStats,
        noteStats,
      };
    } catch (error: any) {
      this.logger.error(`Get stats error: ${error.message}`);
      throw error;
    }
  }
}
