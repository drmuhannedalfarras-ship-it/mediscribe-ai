import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { UserRole } from './user-role.entity';
import { Consultation } from './consultation.entity';
import { AuditLog } from './audit-log.entity';
import { Exclude } from 'class-transformer';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @Column({ unique: true })
  email!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ nullable: true })
  employeeId!: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ nullable: true })
  specialization!: string;

  @Column({ nullable: true })
  licenseNumber!: string;

  @Column({ nullable: true })
  department!: string;

  @Exclude({ toPlainOnly: true })
  @Column()
  passwordHash!: string;

  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  passwordSalt!: string;

  @Column({ nullable: true })
  lastLoginAt!: Date;

  @Column({ nullable: true })
  lastPasswordChangeAt!: Date;

  @Column({ default: false })
  mfaEnabled!: boolean;

  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  mfaSecret!: string;

  @OneToMany(() => UserRole, (userRole) => userRole.user, {
    eager: true,
    cascade: true,
  })
  userRoles!: UserRole[];

  @OneToMany(() => Consultation, (consultation) => consultation.physician)
  consultations!: Consultation[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs!: AuditLog[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  getRoleNames(): string[] {
    return this.userRoles?.map((ur) => ur.role.name) || [];
  }

  hasRole(roleName: string): boolean {
    return this.getRoleNames().includes(roleName);
  }

  hasPermission(permissionName: string): boolean {
    return this.userRoles?.some((ur) =>
      ur.role.permissions?.some((p) => p.name === permissionName),
    ) || false;
  }

  toJSON() {
    const safe: any = { ...this };
    delete safe.passwordHash;
    delete safe.passwordSalt;
    delete safe.mfaSecret;
    return safe;
  }
}
