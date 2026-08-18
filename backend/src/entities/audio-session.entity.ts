import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Consultation } from './consultation.entity';

export enum AudioSessionStatus {
  PENDING = 'PENDING',
  RECORDING = 'RECORDING',
  RECORDED = 'RECORDED',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('audio_sessions')
export class AudioSession {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @OneToOne(() => Consultation, (consultation) => consultation.audioSession, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'consultationId' })
  consultation!: Consultation;

  @Column('uuid')
  consultationId!: string;

  @Column({ type: 'enum', enum: AudioSessionStatus, default: AudioSessionStatus.PENDING })
  status!: AudioSessionStatus;

  @Column({ nullable: true })
  audioFileUrl!: string;

  @Column({ nullable: true })
  audioFileSize!: number; // bytes

  @Column({ nullable: true })
  audioFormat!: string; // e.g., "wav", "mp3"

  @Column({ nullable: true })
  audioCodec!: string;

  @Column({ nullable: true })
  sampleRate!: number; // Hz

  @Column({ type: 'int', nullable: true })
  durationSeconds!: number;

  @Column({ nullable: true })
  recordingStartedAt!: Date;

  @Column({ nullable: true })
  recordingEndedAt!: Date;

  @Column({ nullable: true })
  physicianMicrophoneInput!: string;

  @Column({ nullable: true })
  patientMicrophoneInput!: string;

  @Column({ default: true })
  speakerDiarizationEnabled!: boolean;

  @Column({ default: true })
  noiseReductionEnabled!: boolean;

  @Column({ nullable: true })
  processingNotes!: string;

  @Column({ nullable: true })
  errorMessage!: string;

  @Column({ nullable: true })
  wordCount!: number;

  @Column({ nullable: true })
  processedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  isRecording(): boolean {
    return this.status === AudioSessionStatus.RECORDING;
  }

  isProcessed(): boolean {
    return this.status === AudioSessionStatus.PROCESSED;
  }

  hasFailed(): boolean {
    return this.status === AudioSessionStatus.FAILED;
  }
}
