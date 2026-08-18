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
import { Patient } from './patient.entity';

export enum ConditionStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  REMISSION = 'REMISSION',
  INACTIVE = 'INACTIVE',
}

@Entity('patient_conditions')
export class PatientCondition {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @ManyToOne(() => Patient, (patient) => patient.conditions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patientId' })
  patient!: Patient;

  @Column('uuid')
  patientId!: string;

  @Column()
  conditionName!: string;

  @Column({ nullable: true })
  icdCode!: string;

  @Column({ nullable: true })
  snomedCode!: string;

  @Column({ type: 'enum', enum: ConditionStatus, default: ConditionStatus.ACTIVE })
  status!: ConditionStatus;

  @Column({ nullable: true })
  onsetDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolutionDate!: Date | null;

  @Column({ nullable: true })
  notes!: string;

  @Column({ nullable: true })
  severity!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
