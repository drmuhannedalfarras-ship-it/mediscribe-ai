import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicalNote, NoteStatus as ClinicalNoteStatus } from '@entities/clinical-note.entity';
import { Consultation } from '@entities/consultation.entity';

@Injectable()
export class ClinicalNotesService {
  private readonly logger = new Logger(ClinicalNotesService.name);

  constructor(
    @InjectRepository(ClinicalNote)
    private readonly noteRepository: Repository<ClinicalNote>,
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
  ) {}

  /**
   * Create clinical note (SOAP format)
   */
  async createClinicalNote(
    consultationId: string,
    soapData: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    },
    aiGenerated: boolean = true,
  ): Promise<ClinicalNote> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation not found: ${consultationId}`);
    }

    // Check if note already exists
    const existingNote = await this.noteRepository.findOne({
      where: { consultationId },
    });

    if (existingNote) {
      throw new BadRequestException('Clinical note already exists for this consultation');
    }

    const note = this.noteRepository.create({
      consultation,
      subjective: soapData.subjective,
      objective: soapData.objective,
      assessment: soapData.assessment,
      plan: soapData.plan,
      originalAIContent: aiGenerated
        ? { subjective: soapData.subjective, objective: soapData.objective, assessment: soapData.assessment, plan: soapData.plan }
        : undefined,
      status: aiGenerated ? ClinicalNoteStatus.AI_GENERATED : ClinicalNoteStatus.DRAFT,
    });

    await this.noteRepository.save(note);

    this.logger.log(`Clinical note created: ${consultationId}`);

    return note;
  }

  /**
   * Get clinical note for consultation
   */
  async getClinicalNote(consultationId: string): Promise<ClinicalNote> {
    const note = await this.noteRepository.findOne({
      where: { consultationId },
      relations: ['consultation', 'consultation.patient', 'consultation.physician'],
    });

    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    return note;
  }

  /**
   * Update SOAP sections
   */
  async updateSOAPSection(
    consultationId: string,
    section: 'subjective' | 'objective' | 'assessment' | 'plan',
    content: string,
  ): Promise<ClinicalNote> {
    const note = await this.getClinicalNote(consultationId);

    // Track physician edits
    if (!note.physicianEdits) {
      note.physicianEdits = {};
    }

    const oldValue = note[section];
    note[section] = content;
    note.physicianEdits[section] = {
      original: oldValue,
      modified: content,
      modifiedAt: new Date(),
    };

    // Update status
    if (note.status === ClinicalNoteStatus.AI_GENERATED) {
      note.status = ClinicalNoteStatus.PHYSICIAN_EDITED;
    }

    note.modifiedAt = new Date();

    await this.noteRepository.save(note);

    this.logger.log(
      `Clinical note updated: ${consultationId} (Section: ${section})`,
    );

    return note;
  }

  /**
   * Approve clinical note
   */
  async approveClinicalNote(consultationId: string): Promise<ClinicalNote> {
    const note = await this.getClinicalNote(consultationId);

    if (note.status === ClinicalNoteStatus.FINALIZED) {
      throw new BadRequestException('Note already finalized');
    }

    note.status = ClinicalNoteStatus.FINALIZED;
    note.finalizedAt = new Date();

    await this.noteRepository.save(note);

    this.logger.log(`Clinical note finalized: ${consultationId}`);

    return note;
  }

  /**
   * Amend clinical note
   */
  async amendClinicalNote(
    consultationId: string,
    amendment: string,
  ): Promise<ClinicalNote> {
    const note = await this.getClinicalNote(consultationId);

    if (note.status !== ClinicalNoteStatus.FINALIZED) {
      throw new BadRequestException('Only finalized notes can be amended');
    }

    // Create amendment record
    if (!note.amendments) {
      note.amendments = [];
    }

    note.amendments.push({
      amendment,
      amendedAt: new Date(),
    });

    note.status = ClinicalNoteStatus.AMENDED;
    note.modifiedAt = new Date();

    await this.noteRepository.save(note);

    this.logger.log(`Clinical note amended: ${consultationId}`);

    return note;
  }

  /**
   * Get clinical note as formatted text
   */
  async getFormattedNote(consultationId: string): Promise<string> {
    const note = await this.getClinicalNote(consultationId);

    let formatted = '';

    if (note.subjective) {
      formatted += `SUBJECTIVE:\n${note.subjective}\n\n`;
    }

    if (note.objective) {
      formatted += `OBJECTIVE:\n${note.objective}\n\n`;
    }

    if (note.assessment) {
      formatted += `ASSESSMENT:\n${note.assessment}\n\n`;
    }

    if (note.plan) {
      formatted += `PLAN:\n${note.plan}\n\n`;
    }

    if (note.amendments && note.amendments.length > 0) {
      formatted += `AMENDMENTS:\n`;
      note.amendments.forEach((amendment, index) => {
        formatted += `${index + 1}. ${amendment.amendment} (${amendment.amendedAt})\n`;
      });
    }

    return formatted;
  }

  /**
   * Get note statistics
   */
  async getNoteStats(consultationId: string): Promise<{
    hasNote: boolean;
    status: ClinicalNoteStatus | null;
    characterCount: number;
    wordCount: number;
    amendments: number;
    hasPhysicianEdits: boolean;
  }> {
    try {
      const note = await this.getClinicalNote(consultationId);

      const fullText = `${note.subjective || ''} ${note.objective || ''} ${note.assessment || ''} ${note.plan || ''}`;
      const characterCount = fullText.length;
      const wordCount = fullText.split(/\s+/).filter((w) => w.length > 0).length;
      const amendments = note.amendments?.length || 0;
      const hasPhysicianEdits = !!note.physicianEdits;

      return {
        hasNote: true,
        status: note.status,
        characterCount,
        wordCount,
        amendments,
        hasPhysicianEdits,
      };
    } catch {
      return {
        hasNote: false,
        status: null,
        characterCount: 0,
        wordCount: 0,
        amendments: 0,
        hasPhysicianEdits: false,
      };
    }
  }

  /**
   * Reject clinical note and return to draft
   */
  async rejectClinicalNote(consultationId: string): Promise<ClinicalNote> {
    const note = await this.getClinicalNote(consultationId);

    if (note.status === ClinicalNoteStatus.FINALIZED) {
      throw new BadRequestException('Cannot reject finalized notes');
    }

    note.status = ClinicalNoteStatus.DRAFT;
    note.modifiedAt = new Date();

    await this.noteRepository.save(note);

    this.logger.log(`Clinical note rejected: ${consultationId}`);

    return note;
  }

  /**
   * Get note edit history
   */
  async getEditHistory(consultationId: string): Promise<
    Array<{
      section: string;
      original: string | null;
      modified: string;
      modifiedAt: Date;
    }>
  > {
    const note = await this.getClinicalNote(consultationId);

    if (!note.physicianEdits) {
      return [];
    }

    const history: Array<{
      section: string;
      original: string | null;
      modified: string;
      modifiedAt: Date;
    }> = [];

    Object.entries(note.physicianEdits).forEach(([section, edit]) => {
      history.push({
        section,
        original: edit.original || null,
        modified: edit.modified,
        modifiedAt: edit.modifiedAt,
      });
    });

    return history;
  }

  /**
   * Delete clinical note (soft delete)
   */
  async deleteNote(consultationId: string): Promise<void> {
    const note = await this.getClinicalNote(consultationId);

    await this.noteRepository.softRemove(note);

    this.logger.log(`Clinical note deleted: ${consultationId}`);
  }

  /**
   * Compare original AI content with current
   */
  async compareWithOriginal(consultationId: string): Promise<{
    originalContent: { [key: string]: string | null };
    currentContent: { [key: string]: string | null };
    hasChanges: boolean;
    changedSections: string[];
  }> {
    const note = await this.getClinicalNote(consultationId);

    const currentContent = {
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
    };

    const originalContent = note.originalAIContent || {
      subjective: undefined,
      objective: undefined,
      assessment: undefined,
      plan: undefined,
    };

    const changedSections = (Object.keys(currentContent) as Array<keyof typeof currentContent>).filter(
      (key) => currentContent[key] !== originalContent[key],
    );

    return {
      originalContent,
      currentContent,
      hasChanges: changedSections.length > 0,
      changedSections,
    };
  }
}
