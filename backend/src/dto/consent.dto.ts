import { IsString, IsOptional } from 'class-validator';
import { ConsentStatus } from '@entities/consultation-consent.entity';

export class GiveConsentDto {
  @IsString()
  consultationId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeclineConsentDto {
  @IsString()
  consultationId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class WithdrawConsentDto {
  @IsString()
  consultationId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConsentResponseDto {
  id!: string;
  consultationId!: string;
  status!: ConsentStatus;
  consentVersion!: string;
  consentGivenAt?: Date;
  consentDeclinedAt?: Date;
  consentWithdrawnAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ConsentDetailResponseDto extends ConsentResponseDto {
  consentText?: string;
  notes?: string;
}
