import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consultation } from '@entities/consultation.entity';
import { ClinicalExtraction } from '@entities/clinical-extraction.entity';

@Injectable()
export class MissingInformationService {
  private readonly logger = new Logger(MissingInformationService.name);

  // Clinical information checklist
  private readonly clinicalChecklist = {
    'History of Present Illness': [
      { question: 'Onset (when did symptoms start?)', category: 'timeline' },
      {
        question: 'Duration (how long have symptoms persisted?)',
        category: 'timeline',
      },
      {
        question: 'Severity (on a scale of 1-10, how severe?)',
        category: 'severity',
      },
      {
        question: 'Progression (worsening, improving, stable?)',
        category: 'progression',
      },
      {
        question: 'Aggravating factors (what makes it worse?)',
        category: 'factors',
      },
      {
        question: 'Relieving factors (what makes it better?)',
        category: 'factors',
      },
      {
        question: 'Associated symptoms (any other symptoms?)',
        category: 'symptoms',
      },
    ],
    'Review of Systems': [
      { question: 'Fever or chills?', category: 'constitutional' },
      { question: 'Weight changes?', category: 'constitutional' },
      { question: 'Fatigue or malaise?', category: 'constitutional' },
      { question: 'Sleep disturbance?', category: 'constitutional' },
      { question: 'Appetite changes?', category: 'constitutional' },
    ],
    'Past Medical History': [
      { question: 'Previous similar episodes?', category: 'pmh' },
      { question: 'Chronic conditions (diabetes, HTN, etc)?', category: 'pmh' },
      { question: 'Previous surgeries?', category: 'surgical' },
      { question: 'Hospitalizations?', category: 'hospital' },
    ],
    'Medications': [
      {
        question: 'Current medications and dosages?',
        category: 'medications',
      },
      {
        question: 'Compliance with medications?',
        category: 'medications',
      },
      {
        question: 'Recent medication changes?',
        category: 'medications',
      },
    ],
    'Allergies': [
      {
        question: 'Drug allergies (medications)?',
        category: 'allergies',
      },
      {
        question: 'Food allergies?',
        category: 'allergies',
      },
      {
        question: 'Environmental allergies?',
        category: 'allergies',
      },
    ],
    'Family History': [
      {
        question: 'Family history of similar condition?',
        category: 'family',
      },
      {
        question: 'Cardiac history in family?',
        category: 'family',
      },
      {
        question: 'Malignancy in family?',
        category: 'family',
      },
    ],
    'Social History': [
      { question: 'Smoking history (current/former)?', category: 'social' },
      { question: 'Alcohol use?', category: 'social' },
      { question: 'Substance use?', category: 'social' },
      { question: 'Occupation?', category: 'social' },
      { question: 'Recent travel?', category: 'social' },
    ],
  };

  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(ClinicalExtraction)
    private readonly extractionRepository: Repository<ClinicalExtraction>,
  ) {}

  /**
   * Identify missing clinical information for a consultation
   */
  async identifyMissingInformation(
    consultationId: string,
  ): Promise<Array<{
    category: string;
    question: string;
    relevance: 'high' | 'medium' | 'low';
    reasoning: string;
  }>> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Get extracted information
    const extractions = await this.extractionRepository.find({
      where: { consultationId },
    });

    const discussedTopics = extractions.map((e) =>
      e.category.toLowerCase(),
    );

    // Identify missing items
    const missing: Array<{
      category: string;
      question: string;
      relevance: 'high' | 'medium' | 'low';
      reasoning: string;
    }> = [];

    Object.entries(this.clinicalChecklist).forEach(
      ([section, questions]: [string, any]) => {
        questions.forEach((item: any) => {
          const isDiscussed = discussedTopics.some((topic) =>
            item.question.toLowerCase().includes(topic),
          );

          if (!isDiscussed) {
            const relevance = this.assessRelevance(
              section,
              item,
              discussedTopics,
            );

            missing.push({
              category: section,
              question: item.question,
              relevance,
              reasoning: this.generateReasoning(section, item, relevance),
            });
          }
        });
      },
    );

    this.logger.log(
      `Missing information identified: ${consultationId} (${missing.length} items)`,
    );

    return missing;
  }

  /**
   * Get missing high-priority information
   */
  async getHighPriorityGaps(
    consultationId: string,
  ): Promise<Array<{
    category: string;
    question: string;
    relevance: 'high';
    reasoning: string;
  }>> {
    const allMissing = await this.identifyMissingInformation(consultationId);

    return allMissing.filter(
      (item) => item.relevance === 'high',
    ) as Array<{
      category: string;
      question: string;
      relevance: 'high';
      reasoning: string;
    }>;
  }

  /**
   * Assess relevance of missing information
   */
  private assessRelevance(
    section: string,
    item: any,
    _discussedTopics: string[],
  ): 'high' | 'medium' | 'low' {
    // History of present illness is always high priority
    if (section === 'History of Present Illness') {
      return 'high';
    }

    // Critical items are high priority
    if (
      item.question.toLowerCase().includes('allerg') ||
      item.question.toLowerCase().includes('medication')
    ) {
      return 'high';
    }

    // Review of systems is medium priority
    if (section === 'Review of Systems') {
      return 'medium';
    }

    // Historical items are lower priority
    return 'low';
  }

  /**
   * Generate reasoning for missing information
   */
  private generateReasoning(
    section: string,
    _item: any,
    relevance: string,
  ): string {
    if (relevance === 'high') {
      return `This information is critical for accurate diagnosis and safe patient care in the ${section} section.`;
    } else if (relevance === 'medium') {
      return `This information is important for comprehensive clinical assessment in ${section}.`;
    } else {
      return `This information from ${section} would be helpful for a more complete picture.`;
    }
  }

  /**
   * Check completeness of consultation
   */
  async assessCompleteness(
    consultationId: string,
  ): Promise<{
    completenessScore: number;
    sections: {
      section: string;
      completedItems: number;
      totalItems: number;
      percentage: number;
    }[];
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    const extractions = await this.extractionRepository.find({
      where: { consultationId },
    });

    const discussedTopics = extractions.map((e) =>
      e.category.toLowerCase(),
    );

    const sections = Object.entries(this.clinicalChecklist).map(
      ([section, questions]: [string, any]) => {
        const completedItems = questions.filter((item: any) =>
          discussedTopics.some((topic) =>
            item.question.toLowerCase().includes(topic),
          ),
        ).length;

        const totalItems = questions.length;
        const percentage = (completedItems / totalItems) * 100;

        return {
          section,
          completedItems,
          totalItems,
          percentage,
        };
      },
    );

    // Calculate overall completeness
    const totalCompleted = sections.reduce(
      (sum, s) => sum + s.completedItems,
      0,
    );
    const totalItems = sections.reduce((sum, s) => sum + s.totalItems, 0);
    const completenessScore = (totalCompleted / totalItems) * 100;

    return {
      completenessScore,
      sections,
    };
  }

  /**
   * Get follow-up questions to clarify missing information
   */
  async getFollowUpQuestions(
    consultationId: string,
    limit: number = 5,
  ): Promise<string[]> {
    const missing = await this.identifyMissingInformation(consultationId);

    // Return highest priority questions first
    return missing
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (
          priorityOrder[a.relevance] - priorityOrder[b.relevance]
        );
      })
      .slice(0, limit)
      .map((item) => item.question);
  }

  /**
   * Recommend next step based on missing information
   */
  async getNextSteps(consultationId: string): Promise<{
    immediateQuestions: string[];
    additionalWorkup: string[];
    readyForDiagnosis: boolean;
  }> {
    const missing = await this.getHighPriorityGaps(consultationId);
    const completeness = await this.assessCompleteness(consultationId);

    const immediateQuestions = missing.map((item) => item.question).slice(0, 3);

    const readyForDiagnosis =
      completeness.completenessScore > 70 && missing.length === 0;

    const additionalWorkup = [
      'Consider focused physical examination',
      'Review vital signs',
      'Assess functional status',
    ];

    return {
      immediateQuestions,
      additionalWorkup,
      readyForDiagnosis,
    };
  }
}
