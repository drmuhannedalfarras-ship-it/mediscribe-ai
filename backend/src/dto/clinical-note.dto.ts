import { IsString, IsOptional } from 'class-validator';
import { NoteStatus } from '@entities/clinical-note.entity';

export class GenerateClinicalNoteDto {
  @IsString()
  consultationId!: string;
}

export class UpdateClinicalNoteDto {
  @IsOptional()
  @IsString()
  subjective?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class ApproveClinicalNoteDto {
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class RejectClinicalNoteDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinalizeClinicalNoteDto {
  @IsOptional()
  @IsString()
  finalNotes?: string;
}

export class AmendClinicalNoteDto {
  @IsString()
  amendment!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ClinicalNoteResponseDto {
  id!: string;
  consultationId!: string;
  status!: NoteStatus;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  isAIGenerated!: boolean;
  aiModel?: string;
  modelVersion?: string;
  isPhysicianEdited!: boolean;
  isFinalized!: boolean;
  isAmended!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ClinicalNoteDetailResponseDto extends ClinicalNoteResponseDto {
  fullNote?: string;
  originalAIContent?: string;
  physicianEdits?: string;
  amendmentText?: string;
  reviewedAt?: Date;
  finalizedAt?: Date;
  amendedAt?: Date;
}
