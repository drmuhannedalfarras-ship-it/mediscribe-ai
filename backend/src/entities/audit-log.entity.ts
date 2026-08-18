import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { User } from './user.entity';
import { Consultation } from './consultation.entity';

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',

  // Patient Management
  PATIENT_CREATED = 'PATIENT_CREATED',
  PATIENT_VIEWED = 'PATIENT_VIEWED',
  PATIENT_UPDATED = 'PATIENT_UPDATED',
  PATIENT_DELETED = 'PATIENT_DELETED',
  PATIENT_EXPORTED = 'PATIENT_EXPORTED',

  // Consultation
  CONSULTATION_CREATED = 'CONSULTATION_CREATED',
  CONSULTATION_STARTED = 'CONSULTATION_STARTED',
  CONSULTATION_ENDED = 'CONSULTATION_ENDED',
  CONSULTATION_CANCELLED = 'CONSULTATION_CANCELLED',

  // Consent
  CONSENT_GIVEN = 'CONSENT_GIVEN',
  CONSENT_DECLINED = 'CONSENT_DECLINED',
  CONSENT_WITHDRAWN = 'CONSENT_WITHDRAWN',

  // Audio
  AUDIO_RECORDING_STARTED = 'AUDIO_RECORDING_STARTED',
  AUDIO_RECORDING_STOPPED = 'AUDIO_RECORDING_STOPPED',
  AUDIO_PROCESSING_STARTED = 'AUDIO_PROCESSING_STARTED',
  AUDIO_PROCESSING_COMPLETED = 'AUDIO_PROCESSING_COMPLETED',
  AUDIO_PROCESSING_FAILED = 'AUDIO_PROCESSING_FAILED',
  AUDIO_DELETED = 'AUDIO_DELETED',

  // Transcription
  TRANSCRIPTION_GENERATED = 'TRANSCRIPTION_GENERATED',
  TRANSCRIPTION_EDITED = 'TRANSCRIPTION_EDITED',

  // Clinical Extraction
  CLINICAL_EXTRACTION_COMPLETED = 'CLINICAL_EXTRACTION_COMPLETED',
  CLINICAL_EXTRACTION_FAILED = 'CLINICAL_EXTRACTION_FAILED',

  // AI Note Generation
  AI_NOTE_GENERATED = 'AI_NOTE_GENERATED',
  AI_NOTE_REGENERATED = 'AI_NOTE_REGENERATED',
  AI_NOTE_REJECTED = 'AI_NOTE_REJECTED',

  // Physician Review
  NOTE_REVIEWED = 'NOTE_REVIEWED',
  NOTE_EDITED = 'NOTE_EDITED',
  NOTE_APPROVED = 'NOTE_APPROVED',
  NOTE_REJECTED = 'NOTE_REJECTED',

  // Finalization
  NOTE_FINALIZED = 'NOTE_FINALIZED',
  NOTE_AMENDED = 'NOTE_AMENDED',

  // System
  SYSTEM_CONFIG_CHANGED = 'SYSTEM_CONFIG_CHANGED',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['consultationId', 'action'])
@Index(['action'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  @ManyToOne(() => User, (user) => user.auditLogs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('uuid')
  userId!: string;

  @Column({ nullable: true })
  userRole!: string;

  @ManyToOne(() => Consultation, (consultation) => consultation.auditLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'consultationId' })
  consultation!: Consultation;

  @Column('uuid', { nullable: true })
  consultationId!: string;

  @Column('uuid', { nullable: true })
  patientId!: string;

  @Column('uuid', { nullable: true })
  resourceId!: string;

  @Column({ nullable: true })
  resourceType!: string;

  @Column({ type: 'jsonb', nullable: true })
  changes!: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };

  @Column({ nullable: true })
  description!: string;

  @Column({ nullable: true })
  ipAddress!: string;

  @Column({ nullable: true })
  userAgent!: string;

  @Column({ default: 'SUCCESS' })
  status!: 'SUCCESS' | 'FAILURE' | 'PARTIAL';

  @Column({ nullable: true })
  errorMessage!: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
