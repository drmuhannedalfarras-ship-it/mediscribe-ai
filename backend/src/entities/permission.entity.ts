import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Role } from './role.entity';

export enum SystemPermission {
  // User Management
  USER_CREATE = 'USER_CREATE',
  USER_READ = 'USER_READ',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_MANAGE_ROLES = 'USER_MANAGE_ROLES',

  // Patient Management
  PATIENT_CREATE = 'PATIENT_CREATE',
  PATIENT_READ = 'PATIENT_READ',
  PATIENT_UPDATE = 'PATIENT_UPDATE',
  PATIENT_DELETE = 'PATIENT_DELETE',
  PATIENT_VIEW_HISTORY = 'PATIENT_VIEW_HISTORY',

  // Consultation
  CONSULTATION_CREATE = 'CONSULTATION_CREATE',
  CONSULTATION_READ = 'CONSULTATION_READ',
  CONSULTATION_UPDATE = 'CONSULTATION_UPDATE',
  CONSULTATION_DELETE = 'CONSULTATION_DELETE',
  CONSULTATION_RECORD = 'CONSULTATION_RECORD',
  CONSULTATION_FINALIZE = 'CONSULTATION_FINALIZE',

  // AI Features
  AI_GENERATE_NOTES = 'AI_GENERATE_NOTES',
  AI_VIEW_GENERATED = 'AI_VIEW_GENERATED',
  AI_EDIT_GENERATED = 'AI_EDIT_GENERATED',

  // Audit
  AUDIT_VIEW = 'AUDIT_VIEW',
  AUDIT_EXPORT = 'AUDIT_EXPORT',

  // System Admin
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',

  // Clinical Governance
  CLINICAL_GOVERNANCE_REVIEW = 'CLINICAL_GOVERNANCE_REVIEW',
  CLINICAL_INCIDENT_REPORT = 'CLINICAL_INCIDENT_REPORT',
}

@Entity('permissions')
export class Permission {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @Column({ unique: true })
  name!: string;

  @Column()
  description!: string;

  @Column({ nullable: true })
  category!: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];

  @CreateDateColumn()
  createdAt!: Date;
}
