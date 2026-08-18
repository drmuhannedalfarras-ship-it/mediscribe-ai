import { Inject, Injectable, Logger } from '@nestjs/common';
import { AudioSession } from '@entities/audio-session.entity';
import { TranscriptSegment } from '@entities/transcript-segment.entity';
import { ConsultationStatus } from '@entities/consultation.entity';
import { AudioSessionService } from './audio-session.service';
import { TranscriptService } from './transcript.service';
import { ConsultationsService } from '../consultations.service';
import {
  TRANSCRIPTION_PROVIDER,
  TranscriptionProvider,
} from './transcription/transcription-provider.interface';

@Injectable()
export class AudioUploadOrchestratorService {
  private readonly logger = new Logger(AudioUploadOrchestratorService.name);

  constructor(
    private readonly audioSessionService: AudioSessionService,
    private readonly transcriptService: TranscriptService,
    private readonly consultationsService: ConsultationsService,
    @Inject(TRANSCRIPTION_PROVIDER)
    private readonly transcriptionProvider: TranscriptionProvider,
  ) {}

  async processUpload(
    consultationId: string,
    audioFileUrl: string,
    fileSizeBytes: number,
    format: string,
    durationMs: number,
  ): Promise<{ audioSession: AudioSession; transcript: TranscriptSegment[] }> {
    const audioSession = await this.audioSessionService.saveUploadedAudio(
      consultationId,
      audioFileUrl,
      fileSizeBytes,
      format,
      durationMs,
    );

    try {
      await this.consultationsService.transitionStatus(
        consultationId,
        ConsultationStatus.PROCESSING,
      );

      const segments = await this.transcriptionProvider.transcribe(
        audioSession.durationSeconds,
      );

      const transcript = await this.transcriptService.addTranscriptSegmentsBatch(
        consultationId,
        segments,
      );

      const wordCount = transcript.reduce(
        (sum, segment) => sum + segment.text.split(/\s+/).filter(Boolean).length,
        0,
      );

      await this.audioSessionService.markTranscribed(consultationId, wordCount);

      await this.consultationsService.transitionStatus(
        consultationId,
        ConsultationStatus.AI_REVIEW_READY,
      );

      return {
        audioSession: await this.audioSessionService.getAudioSessionDetails(consultationId),
        transcript,
      };
    } catch (error: any) {
      this.logger.error(`Transcription pipeline failed: ${consultationId} - ${error.message}`);
      await this.audioSessionService.markTranscriptionFailed(consultationId, error.message);
      throw error;
    }
  }
}
