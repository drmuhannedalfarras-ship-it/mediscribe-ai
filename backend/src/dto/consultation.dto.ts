import { IsString, IsOptional } from 'class-validator';
import { ConsultationStatus } from '@entities/consultation.entity';

export class CreateConsultationDto {
  @IsString()
  patientId!: string;

  @IsString()
  reasonForVisit!: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartConsultationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateConsultationDto {
  @IsOptional()
  @IsString()
  reasonForVisit?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConsultationResponseDto {
  id!: string;
  patientId!: string;
  physicianId!: string;
  status!: ConsultationStatus;
  reasonForVisit!: string;
  department?: string;
  specialty?: string;
  consultationDate?: Date;
  endTime?: Date;
  durationSeconds?: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ConsultationDetailResponseDto extends ConsultationResponseDto {
  consent?: any;
  audioSession?: any;
  clinicalExtractions?: any[];
  clinicalNote?: any;
}

export class EndConsultationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinalizeConsultationDto {
  @IsOptional()
  @IsString()
  finalNotes?: string;
}
