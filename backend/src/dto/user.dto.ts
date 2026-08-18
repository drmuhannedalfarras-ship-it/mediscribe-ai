import { IsEmail, IsString, IsOptional, MinLength, IsEnum } from 'class-validator';
import { UserStatus } from '@entities/user.entity';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  department?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class UserResponseDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  fullName!: string;
  specialization?: string;
  licenseNumber?: string;
  department?: string;
  status!: UserStatus;
  roles!: string[];
  lastLoginAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  mfaCode?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;

  @IsString()
  currentPassword!: string;
}

export class AssignRoleDto {
  @IsString()
  roleId!: string;
}

export class RemoveRoleDto {
  @IsString()
  roleId!: string;
}
