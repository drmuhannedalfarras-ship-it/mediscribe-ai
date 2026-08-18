import { IsOptional, IsNumber, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVitalSignsDto {
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsNumber()
  height?: number; // cm

  @IsOptional()
  @IsNumber()
  weight?: number; // kg

  @IsOptional()
  @IsNumber()
  systolicBP?: number;

  @IsOptional()
  @IsNumber()
  diastolicBP?: number;

  @IsOptional()
  @IsNumber()
  pulse?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber()
  spO2?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  measuredAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVitalSignsDto {
  @IsOptional()
  @IsNumber()
  height?: number;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  systolicBP?: number;

  @IsOptional()
  @IsNumber()
  diastolicBP?: number;

  @IsOptional()
  @IsNumber()
  pulse?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  respiratoryRate?: number;

  @IsOptional()
  @IsNumber()
  spO2?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VitalSignsResponseDto {
  id!: string;
  patientId!: string;
  height?: number;
  weight?: number;
  bmi?: number;
  systolicBP?: number;
  diastolicBP?: number;
  pulse?: number;
  temperature?: number;
  respiratoryRate?: number;
  spO2?: number;
  notes?: string;
  measuredAt!: Date;
  createdAt!: Date;
}
