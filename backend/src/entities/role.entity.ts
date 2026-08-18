import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { UserRole } from './user-role.entity';
import { Permission } from './permission.entity';

export enum SystemRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLINICAL_ADMIN = 'CLINICAL_ADMIN',
  PHYSICIAN = 'PHYSICIAN',
  NURSE = 'NURSE',
  AUDITOR = 'AUDITOR',
  CLINICAL_GOVERNANCE = 'CLINICAL_GOVERNANCE',
}

@Entity('roles')
export class Role {
  @PrimaryColumn('uuid')
  id: string = uuid();

  @Column({ unique: true })
  name!: string;

  @Column()
  description!: string;

  @Column({ default: false })
  isSystem!: boolean;

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles!: UserRole[];

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: true,
    cascade: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions!: Permission[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
