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

export enum AllergySeverity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
  CRITICAL = 'CRITICAL',
}

@Entity('patient_allergies')
export class PatientAllergy {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @ManyToOne(() => Patient, (patient) => patient.allergies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patientId' })
  patient!: Patient;

  @Column('uuid')
  patientId!: string;

  @Column()
  allergen!: string;

  @Column({ type: 'enum', enum: AllergySeverity })
  severity!: AllergySeverity;

  @Column({ nullable: true })
  reaction!: string;

  @Column({ nullable: true })
  onsetDate!: Date;

  @Column({ nullable: true })
  notes!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
