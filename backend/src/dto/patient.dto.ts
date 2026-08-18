import {
  IsString,
  IsOptional,
  IsEmail,
  IsDate,
  IsEnum,
} from 'class-validator';
import { Gender, PatientStatus } from '@entities/patient.entity';
import { Type } from 'class-transformer';

export class CreatePatientDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsDate()
  @Type(() => Date)
  dateOfBirth!: Date;

  @IsEnum(Gender)
  gender!: Gender;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  socialHistory?: string;

  @IsOptional()
  @IsString()
  smokingStatus?: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  socialHistory?: string;

  @IsOptional()
  @IsString()
  smokingStatus?: string;

  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;
}

export class PatientResponseDto {
  id!: string;
  patientId!: string;
  mrn!: string;
  firstName!: string;
  lastName!: string;
  fullName!: string;
  dateOfBirth!: Date;
  age!: number;
  gender!: Gender;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  emergencyContact?: string;
  status!: PatientStatus;
  bloodType?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PatientDetailResponseDto extends PatientResponseDto {
  allergies!: any[];
  medications!: any[];
  conditions!: any[];
  vitalSigns!: any[];
}

export class SearchPatientDto {
  @IsOptional()
  @IsString()
  mrn?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  skip?: number;

  @IsOptional()
  take?: number;
}
