import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

export enum AIService {
  SPEECH_TO_TEXT = 'SPEECH_TO_TEXT',
  CLINICAL_EXTRACTION = 'CLINICAL_EXTRACTION',
  NOTE_GENERATION = 'NOTE_GENERATION',
  SPEAKER_DIARIZATION = 'SPEAKER_DIARIZATION',
  SAFETY_CHECK = 'SAFETY_CHECK',
}

export enum ModelStatus {
  EXPERIMENTAL = 'EXPERIMENTAL',
  TESTING = 'TESTING',
  VALIDATED = 'VALIDATED',
  PRODUCTION = 'PRODUCTION',
  DEPRECATED = 'DEPRECATED',
}

@Entity('model_versions')
export class ModelVersion {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @Column()
  service!: AIService;

  @Column()
  provider!: string; // e.g., "Anthropic", "Azure", "Google"

  @Column()
  modelName!: string;

  @Column()
  modelVersion!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ type: 'enum', enum: ModelStatus, default: ModelStatus.EXPERIMENTAL })
  status!: ModelStatus;

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ nullable: true })
  performanceMetrics!: string; // JSON string of metrics

  @Column({ nullable: true })
  validationDate!: Date;

  @Column({ nullable: true })
  validationNotes!: string;

  @Column({ nullable: true })
  deploymentDate!: Date;

  @Column({ nullable: true })
  deprecationDate!: Date;

  @Column({ nullable: true })
  apiKey!: string; // Encrypted in database

  @Column({ type: 'simple-json', nullable: true })
  configuration!: Record<string, any>;

  @Column({ nullable: true })
  regressionTestsUrl!: string;

  @Column({ nullable: true })
  validationResultsUrl!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  isActive(): boolean {
    return this.status === ModelStatus.PRODUCTION || this.status === ModelStatus.VALIDATED;
  }

  isProduction(): boolean {
    return this.status === ModelStatus.PRODUCTION;
  }

  isDeprecated(): boolean {
    return this.status === ModelStatus.DEPRECATED;
  }
}
