import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Consultation } from './consultation.entity';
import { User } from './user.entity';

export enum NoteStatus {
  DRAFT = 'DRAFT',
  AI_GENERATED = 'AI_GENERATED',
  PHYSICIAN_REVIEW = 'PHYSICIAN_REVIEW',
  PHYSICIAN_EDITED = 'PHYSICIAN_EDITED',
  FINALIZED = 'FINALIZED',
  AMENDED = 'AMENDED',
}

/**
 * SOAP Note Format:
 * S - Subjective: Patient-reported symptoms and history
 * O - Objective: Measured findings and vital signs
 * A - Assessment: Clinical summary (NOT diagnosis in Phase 1)
 * P - Plan: Management and follow-up (only what was discussed)
 */
@Entity('clinical_notes')
export class ClinicalNote {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @OneToOne(() => Consultation, (consultation) => consultation.clinicalNote, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'consultationId' })
  consultation!: Consultation;

  @Column('uuid')
  consultationId!: string;

  @Column({ type: 'enum', enum: NoteStatus, default: NoteStatus.DRAFT })
  status!: NoteStatus;

  // SOAP Sections
  @Column({ type: 'text', nullable: true })
  subjective!: string;

  @Column({ type: 'text', nullable: true })
  objective!: string;

  @Column({ type: 'text', nullable: true })
  assessment!: string;

  @Column({ type: 'text', nullable: true })
  plan!: string;

  // Full clinical note (rendered)
  @Column({ type: 'text', nullable: true })
  fullNote!: string;

  // AI Generation Metadata
  @Column({ default: true })
  isAIGenerated!: boolean;

  @Column({ nullable: true })
  aiModel!: string;

  @Column({ nullable: true })
  modelVersion!: string;

  @Column({ nullable: true })
  promptVersion!: string;

  // Original AI content (preserved for audit trail)
  @Column({ type: 'jsonb', nullable: true })
  originalAIContent!: { subjective?: string; objective?: string; assessment?: string; plan?: string };

  // Physician modifications
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy!: User;

  @Column('uuid', { nullable: true })
  reviewedById!: string;

  @Column({ nullable: true })
  reviewedAt!: Date;

  @Column({ type: 'text', nullable: true })
  reviewNotes!: string;

  @Column({ default: false })
  isPhysicianEdited!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  physicianEdits!: Record<string, { original: string; modified: string; modifiedAt: Date }>;

  @Column({ nullable: true })
  editedAt!: Date;

  @Column({ nullable: true })
  modifiedAt!: Date;

  // Finalization
  @Column({ default: false })
  isFinalized!: boolean;

  @Column({ nullable: true })
  finalizedAt!: Date;

  @Column('uuid', { nullable: true })
  finalizedById!: string;

  // Amendment tracking
  @Column({ default: false })
  isAmended!: boolean;

  @Column({ type: 'text', nullable: true })
  amendmentText!: string;

  @Column({ nullable: true })
  amendedAt!: Date;

  @Column('uuid', { nullable: true })
  amendedById!: string;

  @Column({ type: 'jsonb', nullable: true })
  amendments!: Array<{ amendment: string; amendedAt: Date }>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  isDraft(): boolean {
    return this.status === NoteStatus.DRAFT;
  }

  isReviewReady(): boolean {
    return this.status === NoteStatus.AI_GENERATED;
  }

  canBeEdited(): boolean {
    return !this.isFinalized && this.status !== NoteStatus.FINALIZED;
  }

  hasBeenModified(): boolean {
    return this.isPhysicianEdited || this.isAmended;
  }
}
