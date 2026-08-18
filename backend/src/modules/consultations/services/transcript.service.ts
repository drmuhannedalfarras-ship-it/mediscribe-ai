import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TranscriptSegment,
  Speaker,
} from '@entities/transcript-segment.entity';
import { Consultation } from '@entities/consultation.entity';

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  constructor(
    @InjectRepository(TranscriptSegment)
    private readonly transcriptRepository: Repository<TranscriptSegment>,
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
  ) {}

  /**
   * Add transcript segment
   */
  async addTranscriptSegment(
    consultationId: string,
    speaker: Speaker,
    originalText: string,
    startTime: number,
    endTime: number,
    confidence: number | undefined,
    sequenceNumber: number,
  ): Promise<TranscriptSegment> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    const segment = this.transcriptRepository.create({
      consultation,
      speaker,
      text: originalText.trim(),
      startTimestamp: startTime,
      endTimestamp: endTime,
      confidence,
      sequenceNumber,
    });

    await this.transcriptRepository.save(segment);

    this.logger.log(
      `Transcript segment added: ${consultationId} (Speaker: ${speaker})`,
    );

    return segment;
  }

  /**
   * Insert multiple segments in sequence order (used by the transcription pipeline)
   */
  async addTranscriptSegmentsBatch(
    consultationId: string,
    segments: Array<{
      speaker: Speaker;
      text: string;
      startTime: number;
      endTime: number;
      confidence?: number;
    }>,
  ): Promise<TranscriptSegment[]> {
    const results: TranscriptSegment[] = [];
    let sequenceNumber = 0;

    for (const segment of segments) {
      const saved = await this.addTranscriptSegment(
        consultationId,
        segment.speaker,
        segment.text,
        segment.startTime,
        segment.endTime,
        segment.confidence,
        ++sequenceNumber,
      );
      results.push(saved);
    }

    return results;
  }

  /**
   * Get full transcript for consultation
   */
  async getFullTranscript(consultationId: string): Promise<TranscriptSegment[]> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    return this.transcriptRepository.find({
      where: { consultationId },
      order: { startTimestamp: 'ASC' },
    });
  }

  /**
   * Get transcript segments for speaker
   */
  async getTranscriptBySpeaker(
    consultationId: string,
    speaker: Speaker,
  ): Promise<TranscriptSegment[]> {
    return this.transcriptRepository.find({
      where: { consultationId, speaker },
      order: { startTimestamp: 'ASC' },
    });
  }

  /**
   * Correct transcript segment
   */
  async correctSegment(
    segmentId: string,
    correctedText: string,
  ): Promise<TranscriptSegment> {
    const segment = await this.transcriptRepository.findOne({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new NotFoundException('Transcript segment not found');
    }

    segment.correctedText = correctedText.trim();

    await this.transcriptRepository.save(segment);

    this.logger.log(`Transcript segment corrected: ${segmentId}`);

    return segment;
  }

  /**
   * Get transcript as formatted text
   */
  async getFormattedTranscript(consultationId: string): Promise<string> {
    const segments = await this.getFullTranscript(consultationId);

    let currentSpeaker = '';
    let transcript = '';

    segments.forEach((segment) => {
      const speaker = segment.speaker === Speaker.UNKNOWN ? 'Unknown' : segment.speaker;

      if (currentSpeaker !== speaker) {
        transcript += `\n\n**${speaker}:**\n`;
        currentSpeaker = speaker;
      }

      // Use corrected text if available, otherwise use original
      const text = segment.correctedText || segment.text;
      transcript += ` ${text}`;
    });

    return transcript;
  }

  /**
   * Calculate transcript statistics
   */
  async getTranscriptStats(consultationId: string): Promise<{
    totalSegments: number;
    physicianWords: number;
    patientWords: number;
    unknownWords: number;
    totalWords: number;
    duration: number;
    accuracy: number;
  }> {
    const segments = await this.getFullTranscript(consultationId);

    let physicianWords = 0;
    let patientWords = 0;
    let unknownWords = 0;

    segments.forEach((segment) => {
      const text = segment.correctedText || segment.text;
      const wordCount = text.split(/\s+/).length;

      if (segment.speaker === Speaker.PHYSICIAN) {
        physicianWords += wordCount;
      } else if (segment.speaker === Speaker.PATIENT) {
        patientWords += wordCount;
      } else {
        unknownWords += wordCount;
      }
    });

    const totalWords = physicianWords + patientWords + unknownWords;
    const totalSegments = segments.length;
    const duration = segments.length > 0 
      ? segments[segments.length - 1].endTimestamp - segments[0].startTimestamp 
      : 0;

    // Calculate average confidence as accuracy metric
    const totalConfidence = segments.reduce(
      (sum, s) => sum + (s.confidence || 0),
      0,
    );
    const accuracy = totalSegments > 0 ? totalConfidence / totalSegments : 0;

    return {
      totalSegments,
      physicianWords,
      patientWords,
      unknownWords,
      totalWords,
      duration,
      accuracy,
    };
  }

  /**
   * Get transcript segments with pagination
   */
  async getTranscriptPaginated(
    consultationId: string,
    skip: number = 0,
    take: number = 20,
  ): Promise<{
    data: TranscriptSegment[];
    total: number;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    const [data, total] = await this.transcriptRepository.findAndCount({
      where: { consultationId },
      skip,
      take,
      order: { startTimestamp: 'ASC' },
    });

    return { data, total };
  }

  /**
   * Search transcript for keywords
   */
  async searchTranscript(
    consultationId: string,
    keyword: string,
  ): Promise<TranscriptSegment[]> {
    if (!keyword || keyword.length < 2) {
      throw new BadRequestException('Search keyword must be at least 2 characters');
    }

    const segments = await this.getFullTranscript(consultationId);

    return segments.filter((segment) => {
      const text = segment.correctedText || segment.text;
      return text.toLowerCase().includes(keyword.toLowerCase());
    });
  }

  /**
   * Delete transcript (soft delete)
   */
  async deleteTranscript(consultationId: string): Promise<void> {
    const segments = await this.getFullTranscript(consultationId);

    await this.transcriptRepository.softRemove(segments);

    this.logger.log(`Transcript deleted: ${consultationId}`);
  }

  /**
   * Get transcript with low confidence segments
   */
  async getLowConfidenceSegments(
    consultationId: string,
    threshold: number = 0.7,
  ): Promise<TranscriptSegment[]> {
    const segments = await this.getFullTranscript(consultationId);

    return segments.filter((segment) => {
      const confidence = segment.confidence || 1;
      return confidence < threshold;
    });
  }
}
