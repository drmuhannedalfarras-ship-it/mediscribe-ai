export type AudioSessionStatus =
  | 'PENDING'
  | 'RECORDING'
  | 'RECORDED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'ARCHIVED';

export interface AudioSessionDto {
  id: string;
  consultationId: string;
  status: AudioSessionStatus;
  durationSeconds?: number;
  audioFormat?: string;
  wordCount?: number;
  errorMessage?: string;
  recordingStartedAt?: string;
  recordingEndedAt?: string;
  processedAt?: string;
}

export interface TranscriptSegmentDto {
  id: string;
  sequenceNumber: number;
  speaker: 'PHYSICIAN' | 'PATIENT' | 'UNKNOWN';
  text: string;
  startTimestamp?: number;
  endTimestamp?: number;
  confidence?: number;
}

export interface AudioUploadResponse {
  statusCode: number;
  message: string;
  audioSession: AudioSessionDto;
  transcript: TranscriptSegmentDto[];
}
