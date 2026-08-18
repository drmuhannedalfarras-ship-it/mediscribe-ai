import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Patient } from './patient.entity';
import { User } from './user.entity';
import { ConsultationConsent } from './consultation-consent.entity';
import { AudioSession } from './audio-session.entity';
import { TranscriptSegment } from './transcript-segment.entity';
import { ClinicalExtraction } from './clinical-extraction.entity';
import { ClinicalNote } from './clinical-note.entity';
import { AuditLog } from './audit-log.entity';

export enum ConsultationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  PROCESSING = 'PROCESSING',
  AI_REVIEW_READY = 'AI_REVIEW_READY',
  PHYSICIAN_REVIEW = 'PHYSICIAN_REVIEW',
  FINALIZED = 'FINALIZED',
  AMENDED = 'AMENDED',
  CANCELLED = 'CANCELLED',
}

@Entity('consultations')
@Index(['patientId', 'consultationDate'])
@Index(['status'])
@Index(['physicianId'])
export class Consultation {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @ManyToOne(() => Patient, (patient) => patient.consultations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patientId' })
  patient!: Patient;

  @Column('uuid')
  patientId!: string;

  @ManyToOne(() => User, (user) => user.consultations)
  @JoinColumn({ name: 'physicianId' })
  physician!: User;

  @Column('uuid')
  physicianId!: string;

  @Column({ type: 'enum', enum: ConsultationStatus, default: ConsultationStatus.SCHEDULED })
  status!: ConsultationStatus;

  @Column({ nullable: true })
  department!: string;

  @Column({ nullable: true })
  specialty!: string;

  @Column()
  reasonForVisit!: string;

  @Column({ type: 'timestamp', nullable: true })
  consultationDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime!: Date;

  @Column({ type: 'int', nullable: true })
  durationSeconds!: number;

  @Column({ nullable: true })
  notes!: string;

  @Column({ type: 'timestamp', nullable: true })
  startedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  finalizedAt!: Date;

  // Relationships
  @OneToOne(() => ConsultationConsent, (consent) => consent.consultation, {
    eager: true,
    cascade: true,
  })
  consent!: ConsultationConsent;

  // Note: not eager-loaded — audio_sessions/clinical_extractions/clinical_notes
  // tables have schema drift from these entities (never reconciled for the
  // audio/transcription/AI-note features, which aren't built out yet). Load
  // explicitly via `relations`/joins once those tables are fixed.
  @OneToOne(() => AudioSession, (audioSession) => audioSession.consultation, {
    cascade: true,
  })
  audioSession!: AudioSession;

  @OneToMany(() => TranscriptSegment, (segment) => segment.consultation, {
    cascade: true,
  })
  transcriptSegments!: TranscriptSegment[];

  @OneToMany(() => ClinicalExtraction, (extraction) => extraction.consultation, {
    cascade: true,
  })
  clinicalExtractions!: ClinicalExtraction[];

  @OneToOne(() => ClinicalNote, (clinicalNote) => clinicalNote.consultation, {
    cascade: true,
  })
  clinicalNote!: ClinicalNote;

  @OneToMany(() => AuditLog, (auditLog) => auditLog.consultation)
  auditLogs!: AuditLog[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  isDraft(): boolean {
    return this.status === ConsultationStatus.SCHEDULED || 
           this.status === ConsultationStatus.IN_PROGRESS ||
           this.status === ConsultationStatus.PROCESSING;
  }

  isFinalized(): boolean {
    return this.status === ConsultationStatus.FINALIZED;
  }

  canBeEdited(): boolean {
    return !this.isFinalized();
  }
}
