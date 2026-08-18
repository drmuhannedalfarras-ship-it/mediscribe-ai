import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Consultation } from './consultation.entity';
import { PatientAllergy } from './patient-allergy.entity';
import { PatientMedication } from './patient-medication.entity';
import { PatientCondition } from './patient-condition.entity';
import { VitalSigns } from './vital-signs.entity';

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  NOT_SPECIFIED = 'NOT_SPECIFIED',
}

export enum PatientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DECEASED = 'DECEASED',
}

@Entity('patients')
@Index(['mrn'], { unique: true })
@Index(['patientId'], { unique: true })
@Index(['email'])
export class Patient {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @Column({ unique: true })
  patientId!: string; // MRN or Medical Record Number

  @Column({ unique: true })
  mrn!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  dateOfBirth!: Date;

  @Column({ type: 'enum', enum: Gender })
  gender!: Gender;

  @Column({ nullable: true })
  nationality!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  phoneNumber!: string;

  @Column({ nullable: true })
  address!: string;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  state!: string;

  @Column({ nullable: true })
  postalCode!: string;

  @Column({ nullable: true })
  country!: string;

  @Column({ nullable: true })
  emergencyContact!: string;

  @Column({ nullable: true })
  emergencyContactPhone!: string;

  @Column({ type: 'enum', enum: PatientStatus, default: PatientStatus.ACTIVE })
  status!: PatientStatus;

  // Medical Information
  @Column({ nullable: true })
  bloodType!: string;

  @Column({ nullable: true })
  familyHistory!: string;

  @Column({ nullable: true })
  socialHistory!: string;

  @Column({ nullable: true })
  smokingStatus!: string;

  @Column({ nullable: true })
  notes!: string;

  // Relationships
  @OneToMany(() => Consultation, (consultation) => consultation.patient)
  consultations!: Consultation[];

  @OneToMany(() => PatientAllergy, (allergy) => allergy.patient, {
    eager: true,
    cascade: true,
  })
  allergies!: PatientAllergy[];

  @OneToMany(() => PatientMedication, (medication) => medication.patient, {
    eager: true,
    cascade: true,
  })
  medications!: PatientMedication[];

  @OneToMany(() => PatientCondition, (condition) => condition.patient, {
    eager: true,
    cascade: true,
  })
  conditions!: PatientCondition[];

  @OneToMany(() => VitalSigns, (vitalSigns) => vitalSigns.patient)
  vitalSigns!: VitalSigns[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get age(): number {
    return this.getAge();
  }

  getAge(): number {
    const today = new Date();
    let age = today.getFullYear() - this.dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())
    ) {
      age--;
    }

    return age;
  }

  toJSON() {
    return { ...this, fullName: this.fullName, age: this.age };
  }
}
