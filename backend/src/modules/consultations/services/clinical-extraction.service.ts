import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClinicalExtraction,
  ClinicalCategory,
  ExtractionStatus,
} from '@entities/clinical-extraction.entity';
import { Consultation } from '@entities/consultation.entity';

@Injectable()
export class ClinicalExtractionService {
  private readonly logger = new Logger(ClinicalExtractionService.name);

  constructor(
    @InjectRepository(ClinicalExtraction)
    private readonly extractionRepository: Repository<ClinicalExtraction>,
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
  ) {}

  /**
   * Create clinical extraction record
   */
  async createExtraction(
    consultationId: string,
    dataType: string,
    extractedValue: string,
    confidence: number = 1.0,
    status: ExtractionStatus = ExtractionStatus.POSITIVE,
  ): Promise<ClinicalExtraction> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Validate confidence range
    if (confidence < 0 || confidence > 1) {
      throw new BadRequestException('Confidence must be between 0 and 1');
    }

    const extraction = this.extractionRepository.create({
      consultation,
      category: dataType as ClinicalCategory,
      extractedValue,
      confidence,
      status,
    });

    await this.extractionRepository.save(extraction);

    this.logger.log(
      `Clinical extraction created: ${consultationId} (Type: ${dataType}, Status: ${status})`,
    );

    return extraction;
  }

  /**
   * Get all clinical extractions for consultation
   */
  async getExtractions(consultationId: string): Promise<ClinicalExtraction[]> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    return this.extractionRepository.find({
      where: { consultationId },
      order: { category: 'ASC', createdAt: 'DESC' },
    });
  }

  /**
   * Get extractions by type
   */
  async getExtractionsByType(
    consultationId: string,
    dataType: string,
  ): Promise<ClinicalExtraction[]> {
    return this.extractionRepository.find({
      where: { consultationId, category: dataType as ClinicalCategory },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get positive extractions (confirmed findings)
   */
  async getPositiveExtractions(
    consultationId: string,
  ): Promise<ClinicalExtraction[]> {
    return this.extractionRepository.find({
      where: {
        consultationId,
        status: ExtractionStatus.POSITIVE,
      },
      order: { category: 'ASC' },
    });
  }

  /**
   * Get negative extractions (denied findings)
   */
  async getNegativeExtractions(
    consultationId: string,
  ): Promise<ClinicalExtraction[]> {
    return this.extractionRepository.find({
      where: {
        consultationId,
        status: ExtractionStatus.NEGATIVE,
      },
      order: { category: 'ASC' },
    });
  }

  /**
   * Get unknown extractions (not discussed)
   */
  async getUnknownExtractions(
    consultationId: string,
  ): Promise<ClinicalExtraction[]> {
    return this.extractionRepository.find({
      where: {
        consultationId,
        status: ExtractionStatus.UNKNOWN,
      },
      order: { category: 'ASC' },
    });
  }

  /**
   * Update extraction status with physician modification
   */
  async updateExtraction(
    extractionId: string,
    status?: ExtractionStatus,
    physicianModification?: string,
  ): Promise<ClinicalExtraction> {
    const extraction = await this.extractionRepository.findOne({
      where: { id: extractionId },
    });

    if (!extraction) {
      throw new NotFoundException('Clinical extraction not found');
    }

    if (status) {
      extraction.status = status;
    }

    if (physicianModification) {
      extraction.physicianModification = physicianModification;
    }

    extraction.modifiedAt = new Date();

    await this.extractionRepository.save(extraction);

    this.logger.log(
      `Clinical extraction updated: ${extractionId} (Status: ${status || extraction.status})`,
    );

    return extraction;
  }

  /**
   * Get high-confidence extractions
   */
  async getHighConfidenceExtractions(
    consultationId: string,
    threshold: number = 0.8,
  ): Promise<ClinicalExtraction[]> {
    const extractions = await this.getExtractions(consultationId);

    return extractions.filter((e) => e.confidence >= threshold);
  }

  /**
   * Get low-confidence extractions requiring review
   */
  async getLowConfidenceExtractions(
    consultationId: string,
    threshold: number = 0.8,
  ): Promise<ClinicalExtraction[]> {
    const extractions = await this.getExtractions(consultationId);

    return extractions.filter((e) => e.confidence < threshold);
  }

  /**
   * Get extraction statistics
   */
  async getExtractionStats(consultationId: string): Promise<{
    total: number;
    positive: number;
    negative: number;
    unknown: number;
    avgConfidence: number;
    modifiedCount: number;
  }> {
    const extractions = await this.getExtractions(consultationId);

    const positive = extractions.filter(
      (e) => e.status === ExtractionStatus.POSITIVE,
    ).length;
    const negative = extractions.filter(
      (e) => e.status === ExtractionStatus.NEGATIVE,
    ).length;
    const unknown = extractions.filter(
      (e) => e.status === ExtractionStatus.UNKNOWN,
    ).length;

    const totalConfidence = extractions.reduce((sum, e) => sum + e.confidence, 0);
    const avgConfidence =
      extractions.length > 0 ? totalConfidence / extractions.length : 0;

    const modifiedCount = extractions.filter(
      (e) => e.physicianModification,
    ).length;

    return {
      total: extractions.length,
      positive,
      negative,
      unknown,
      avgConfidence,
      modifiedCount,
    };
  }

  /**
   * Batch create extractions
   */
  async batchCreateExtractions(
    consultationId: string,
    extractions: Array<{
      dataType: string;
      extractedValue: string;
      confidence?: number;
      status?: ExtractionStatus;
    }>,
  ): Promise<ClinicalExtraction[]> {
    const results: ClinicalExtraction[] = [];

    for (const ext of extractions) {
      const extraction = await this.createExtraction(
        consultationId,
        ext.dataType,
        ext.extractedValue,
        ext.confidence,
        ext.status,
      );
      results.push(extraction);
    }

    return results;
  }

  /**
   * Delete extraction (soft delete)
   */
  async deleteExtraction(extractionId: string): Promise<void> {
    const extraction = await this.extractionRepository.findOne({
      where: { id: extractionId },
    });

    if (!extraction) {
      throw new NotFoundException('Clinical extraction not found');
    }

    await this.extractionRepository.softRemove(extraction);

    this.logger.log(`Clinical extraction deleted: ${extractionId}`);
  }

  /**
   * Mark all extractions as reviewed
   */
  async markAsReviewed(consultationId: string): Promise<void> {
    const extractions = await this.getExtractions(consultationId);

    for (const extraction of extractions) {
      extraction.modifiedAt = new Date();
      await this.extractionRepository.save(extraction);
    }

    this.logger.log(`All extractions marked as reviewed: ${consultationId}`);
  }
}
