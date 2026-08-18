import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AudioSession, AudioSessionStatus } from '@entities/audio-session.entity';
import { Consultation } from '@entities/consultation.entity';

@Injectable()
export class AudioSessionService {
  private readonly logger = new Logger(AudioSessionService.name);

  // Audio constraints
  private readonly AUDIO_CONSTRAINTS = {
    maxDuration: 3600 * 1000, // 60 minutes in ms
    minDuration: 10 * 1000, // 10 seconds in ms
    supportedFormats: ['wav', 'mp3', 'opus', 'webm'],
    maxFileSize: 500 * 1024 * 1024, // 500MB
  };

  constructor(
    @InjectRepository(AudioSession)
    private readonly audioSessionRepository: Repository<AudioSession>,
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
  ) {}

  /**
   * Start audio recording session
   */
  async startRecording(consultationId: string): Promise<AudioSession> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Audio session has a one-to-one relationship with the consultation, so
    // re-recording reuses (resets) the existing row rather than inserting a
    // second one.
    const existingSession = await this.audioSessionRepository.findOne({
      where: { consultationId },
    });

    if (existingSession) {
      if (existingSession.status === AudioSessionStatus.RECORDING) {
        throw new BadRequestException('Recording already in progress for this consultation');
      }

      existingSession.status = AudioSessionStatus.RECORDING;
      existingSession.recordingStartedAt = new Date();
      existingSession.recordingEndedAt = null as any;
      existingSession.audioFileUrl = null as any;
      existingSession.durationSeconds = null as any;
      existingSession.wordCount = null as any;
      existingSession.processedAt = null as any;
      existingSession.errorMessage = null as any;

      await this.audioSessionRepository.save(existingSession);

      this.logger.log(`Audio recording restarted: ${consultationId}`);

      return existingSession;
    }

    const audioSession = this.audioSessionRepository.create({
      consultation,
      status: AudioSessionStatus.RECORDING,
      recordingStartedAt: new Date(),
    });

    await this.audioSessionRepository.save(audioSession);

    this.logger.log(`Audio recording started: ${consultationId}`);

    return audioSession;
  }

  /**
   * Stop recording and save audio file reference
   */
  async stopRecording(
    consultationId: string,
    audioFileUrl: string,
    duration: number,
  ): Promise<AudioSession> {
    const audioSession = await this.audioSessionRepository.findOne({
      where: {
        consultationId,
        status: AudioSessionStatus.RECORDING,
      },
    });

    if (!audioSession) {
      throw new NotFoundException('No active recording found for this consultation');
    }

    // Validate duration
    if (duration < this.AUDIO_CONSTRAINTS.minDuration) {
      throw new BadRequestException('Recording too short (minimum 10 seconds)');
    }

    if (duration > this.AUDIO_CONSTRAINTS.maxDuration) {
      throw new BadRequestException('Recording too long (maximum 60 minutes)');
    }

    audioSession.status = AudioSessionStatus.PROCESSING;
    audioSession.recordingEndedAt = new Date();
    audioSession.audioFileUrl = audioFileUrl;
    audioSession.durationSeconds = Math.round(duration / 1000);

    await this.audioSessionRepository.save(audioSession);

    this.logger.log(
      `Audio recording stopped: ${consultationId} (Duration: ${duration}ms)`,
    );

    return audioSession;
  }

  /**
   * Save an uploaded audio file against the active recording session
   */
  async saveUploadedAudio(
    consultationId: string,
    audioFileUrl: string,
    fileSizeBytes: number,
    format: string,
    durationMs: number,
  ): Promise<AudioSession> {
    const audioSession = await this.stopRecording(consultationId, audioFileUrl, durationMs);

    audioSession.audioFileSize = fileSizeBytes;
    audioSession.audioFormat = format;

    await this.audioSessionRepository.save(audioSession);

    return audioSession;
  }

  /**
   * Mark transcription as completed
   */
  async markTranscribed(
    consultationId: string,
    wordCount: number,
  ): Promise<AudioSession> {
    const audioSession = await this.audioSessionRepository.findOne({
      where: { consultationId },
      order: { createdAt: 'DESC' },
    });

    if (!audioSession) {
      throw new NotFoundException('Audio session not found');
    }

    audioSession.status = AudioSessionStatus.PROCESSED;
    audioSession.wordCount = wordCount;
    audioSession.processedAt = new Date();

    await this.audioSessionRepository.save(audioSession);

    this.logger.log(
      `Audio transcribed: ${consultationId} (Words: ${wordCount})`,
    );

    return audioSession;
  }

  /**
   * Mark transcription failed
   */
  async markTranscriptionFailed(
    consultationId: string,
    errorMessage: string,
  ): Promise<AudioSession> {
    const audioSession = await this.audioSessionRepository.findOne({
      where: { consultationId },
      order: { createdAt: 'DESC' },
    });

    if (!audioSession) {
      throw new NotFoundException('Audio session not found');
    }

    audioSession.status = AudioSessionStatus.FAILED;
    audioSession.errorMessage = errorMessage;
    audioSession.processedAt = new Date();

    await this.audioSessionRepository.save(audioSession);

    this.logger.warn(
      `Audio transcription failed: ${consultationId} - ${errorMessage}`,
    );

    return audioSession;
  }

  /**
   * Get audio session for consultation
   */
  async getAudioSession(consultationId: string): Promise<AudioSession | null> {
    return this.audioSessionRepository.findOne({
      where: { consultationId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Validate audio file
   */
  validateAudioFile(
    fileName: string,
    fileSizeBytes: number,
  ): { valid: boolean; error?: string } {
    // Check file extension
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (!ext || !this.AUDIO_CONSTRAINTS.supportedFormats.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported audio format. Supported: ${this.AUDIO_CONSTRAINTS.supportedFormats.join(', ')}`,
      };
    }

    // Check file size
    if (fileSizeBytes > this.AUDIO_CONSTRAINTS.maxFileSize) {
      return {
        valid: false,
        error: `File too large. Maximum: ${this.AUDIO_CONSTRAINTS.maxFileSize / 1024 / 1024}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Get audio session statistics
   */
  async getAudioStats(): Promise<{
    totalSessions: number;
    completed: number;
    failed: number;
    totalDuration: number;
    avgDuration: number;
    totalWords: number;
  }> {
    const sessions = await this.audioSessionRepository.find({
      where: { status: AudioSessionStatus.PROCESSED },
    });

    const totalSessions = await this.audioSessionRepository.count();
    const completed = sessions.length;
    const failed = await this.audioSessionRepository.count({
      where: { status: AudioSessionStatus.FAILED },
    });

    const totalDuration = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const avgDuration = completed > 0 ? totalDuration / completed : 0;
    const totalWords = sessions.reduce((sum, s) => sum + (s.wordCount || 0), 0);

    return {
      totalSessions,
      completed,
      failed,
      totalDuration,
      avgDuration,
      totalWords,
    };
  }

  /**
   * Delete audio recording (soft delete)
   */
  async deleteRecording(consultationId: string): Promise<void> {
    const audioSession = await this.getAudioSession(consultationId);

    if (!audioSession) {
      throw new NotFoundException('Audio session not found');
    }

    await this.audioSessionRepository.softRemove(audioSession);

    this.logger.log(`Audio recording deleted: ${consultationId}`);
  }

  /**
   * Get audio session with full details
   */
  async getAudioSessionDetails(consultationId: string): Promise<AudioSession> {
    const audioSession = await this.getAudioSession(consultationId);

    if (!audioSession) {
      throw new NotFoundException('Audio session not found');
    }

    return audioSession;
  }
}
