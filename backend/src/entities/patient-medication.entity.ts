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

export enum MedicationStatus {
  ACTIVE = 'ACTIVE',
  DISCONTINUED = 'DISCONTINUED',
  SUSPENDED = 'SUSPENDED',
  COMPLETED = 'COMPLETED',
}

@Entity('patient_medications')
export class PatientMedication {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @ManyToOne(() => Patient, (patient) => patient.medications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patientId' })
  patient!: Patient;

  @Column('uuid')
  patientId!: string;

  @Column()
  medicationName!: string;

  @Column({ nullable: true })
  genericName!: string;

  @Column({ nullable: true })
  strength!: string;

  @Column({ nullable: true })
  dosageForm!: string;

  @Column({ nullable: true })
  route!: string;

  @Column({ nullable: true })
  dose!: string;

  @Column({ nullable: true })
  frequency!: string;

  @Column({ type: 'enum', enum: MedicationStatus, default: MedicationStatus.ACTIVE })
  status!: MedicationStatus;

  @Column({ nullable: true })
  startDate!: Date;

  @Column({ nullable: true })
  endDate!: Date;

  @Column({ nullable: true })
  indication!: string;

  @Column({ nullable: true })
  prescriber!: string;

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
