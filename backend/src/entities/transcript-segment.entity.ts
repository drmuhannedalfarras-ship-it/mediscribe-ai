import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Consultation } from './consultation.entity';

export enum Speaker {
  PHYSICIAN = 'PHYSICIAN',
  PATIENT = 'PATIENT',
  UNKNOWN = 'UNKNOWN',
}

@Entity('transcript_segments')
@Index(['consultationId', 'sequenceNumber'])
export class TranscriptSegment {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @ManyToOne(() => Consultation, (consultation) => consultation.transcriptSegments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'consultationId' })
  consultation!: Consultation;

  @Column('uuid')
  consultationId!: string;

  @Column()
  sequenceNumber!: number;

  @Column({ type: 'enum', enum: Speaker })
  speaker!: Speaker;

  @Column()
  text!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  startTimestamp!: number; // seconds

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  endTimestamp!: number; // seconds

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence!: number; // 0-1

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  speakerConfidence!: number; // Diarization confidence 0-1

  // Corrections and modifications
  @Column({ nullable: true })
  correctedText!: string;

  @Column({ default: false })
  isManuallyEdited!: boolean;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  getDisplayText(): string {
    return this.correctedText || this.text;
  }

  isPhysician(): boolean {
    return this.speaker === Speaker.PHYSICIAN;
  }

  isPatient(): boolean {
    return this.speaker === Speaker.PATIENT;
  }
}
