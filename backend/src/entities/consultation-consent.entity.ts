import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Consultation } from './consultation.entity';

export enum ConsentStatus {
  PENDING = 'PENDING',
  GIVEN = 'GIVEN',
  DECLINED = 'DECLINED',
  WITHDRAWN = 'WITHDRAWN',
}

@Entity('consultation_consents')
export class ConsultationConsent {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @OneToOne(() => Consultation, (consultation) => consultation.consent, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'consultationId' })
  consultation!: Consultation;

  @Column('uuid')
  consultationId!: string;

  @Column({ type: 'enum', enum: ConsentStatus, default: ConsentStatus.PENDING })
  status!: ConsentStatus;

  @Column()
  consentVersion!: string;

  @Column({ nullable: true })
  consentText!: string;

  @Column({ nullable: true })
  consentGivenAt!: Date;

  @Column({ nullable: true })
  consentDeclinedAt!: Date;

  @Column({ nullable: true })
  consentWithdrawnAt!: Date;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  isGiven(): boolean {
    return this.status === ConsentStatus.GIVEN;
  }

  isPending(): boolean {
    return this.status === ConsentStatus.PENDING;
  }

  isDeclined(): boolean {
    return this.status === ConsentStatus.DECLINED;
  }
}
