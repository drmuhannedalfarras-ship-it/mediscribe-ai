import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Patient } from './patient.entity';
import { User } from './user.entity';

@Entity('vital_signs')
@Index(['patientId', 'measuredAt'])
export class VitalSigns {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @ManyToOne(() => Patient, (patient) => patient.vitalSigns, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patientId' })
  patient!: Patient;

  @Column('uuid')
  patientId!: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'recordedById' })
  recordedBy!: User;

  @Column('uuid', { nullable: true })
  recordedById!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height!: number; // cm

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight!: number; // kg

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  bmi!: number | null;

  @Column({ nullable: true })
  systolicBP!: number; // mmHg

  @Column({ nullable: true })
  diastolicBP!: number; // mmHg

  @Column({ nullable: true })
  pulse!: number; // beats/min

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperature!: number; // Celsius

  @Column({ nullable: true })
  respiratoryRate!: number; // breaths/min

  @Column({ nullable: true })
  spO2!: number; // %

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  measuredAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  calculateBMI(): number | null {
    if (!this.height || !this.weight) {
      return null;
    }
    const heightInMeters = this.height / 100;
    return Math.round((this.weight / (heightInMeters * heightInMeters)) * 100) / 100;
  }

  beforeInsert(): void {
    if (this.height && this.weight) {
      this.bmi = this.calculateBMI();
    }
  }

  beforeUpdate(): void {
    if (this.height && this.weight) {
      this.bmi = this.calculateBMI();
    }
  }
}
