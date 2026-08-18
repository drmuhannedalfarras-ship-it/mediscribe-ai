import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class StartAudioRecordingDto {
  @IsString()
  consultationId!: string;

  @IsOptional()
  @IsString()
  physicianMicrophoneInput?: string;

  @IsOptional()
  @IsString()
  patientMicrophoneInput?: string;
}

export class StopAudioRecordingDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UploadAudioDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  duration!: number; // milliseconds, sent as a string by FormData
}

export class AudioSessionResponseDto {
  id!: string;
  consultationId!: string;
  status!: string;
  durationSeconds?: number;
  audioFormat?: string;
  sampleRate?: number;
  speakerDiarizationEnabled!: boolean;
  noiseReductionEnabled!: boolean;
  recordingStartedAt?: Date;
  recordingEndedAt?: Date;
  createdAt!: Date;
}

export class TranscriptSegmentResponseDto {
  id!: string;
  consultationId!: string;
  sequenceNumber!: number;
  speaker!: string;
  text!: string;
  correctedText?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  confidence?: number;
  isManuallyEdited!: boolean;
  createdAt!: Date;
}

export class CorrectTranscriptSegmentDto {
  @IsString()
  segmentId!: string;

  @IsString()
  correctedText!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LiveTranscriptUpdateDto {
  @IsString()
  consultationId!: string;

  transcriptSegments!: TranscriptSegmentResponseDto[];

  timestamp!: Date;
}
