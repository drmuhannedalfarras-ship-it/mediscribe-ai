import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Consultation } from './consultation.entity';

export enum ExtractionStatus {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  UNKNOWN = 'UNKNOWN',
}

export enum ClinicalCategory {
  CHIEF_COMPLAINT = 'CHIEF_COMPLAINT',
  SYMPTOMS = 'SYMPTOMS',
  MEDICAL_HISTORY = 'MEDICAL_HISTORY',
  SURGICAL_HISTORY = 'SURGICAL_HISTORY',
  MEDICATION = 'MEDICATION',
  ALLERGY = 'ALLERGY',
  FAMILY_HISTORY = 'FAMILY_HISTORY',
  SOCIAL_HISTORY = 'SOCIAL_HISTORY',
  REVIEW_OF_SYSTEMS = 'REVIEW_OF_SYSTEMS',
  OBJECTIVE_FINDINGS = 'OBJECTIVE_FINDINGS',
  VITAL_SIGNS = 'VITAL_SIGNS',
  PHYSICAL_EXAMINATION = 'PHYSICAL_EXAMINATION',
  OTHER = 'OTHER',
}

@Entity('clinical_extractions')
export class ClinicalExtraction {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @ManyToOne(() => Consultation, (consultation) => consultation.clinicalExtractions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'consultationId' })
  consultation!: Consultation;

  @Column('uuid')
  consultationId!: string;

  @Column({ type: 'enum', enum: ClinicalCategory })
  category!: ClinicalCategory;

  @Column()
  extractedValue!: string;

  @Column({ type: 'enum', enum: ExtractionStatus })
  status!: ExtractionStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence!: number; // 0-1

  @Column({ nullable: true })
  sourceText!: string;

  @Column({ type: 'int', nullable: true })
  startTimestamp!: number;

  @Column({ type: 'int', nullable: true })
  endTimestamp!: number;

  // AI Metadata
  @Column({ nullable: true })
  aiModel!: string;

  @Column({ nullable: true })
  modelVersion!: string;

  @Column({ nullable: true })
  promptVersion!: string;

  // Physician override
  @Column({ default: false })
  isPhysicianModified!: boolean;

  @Column({ nullable: true })
  physicianModification!: string;

  @Column({ nullable: true })
  modifiedAt!: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Important: Never convert UNKNOWN to POSITIVE or NEGATIVE
   */
  isUnknown(): boolean {
    return this.status === ExtractionStatus.UNKNOWN;
  }

  isPositive(): boolean {
    return this.status === ExtractionStatus.POSITIVE;
  }

  isNegative(): boolean {
    return this.status === ExtractionStatus.NEGATIVE;
  }

  getDisplayValue(): string {
    return this.physicianModification || this.extractedValue;
  }
}
