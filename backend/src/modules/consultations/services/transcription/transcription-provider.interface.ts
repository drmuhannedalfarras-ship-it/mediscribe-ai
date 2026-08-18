import { Speaker } from '@entities/transcript-segment.entity';

export const TRANSCRIPTION_PROVIDER = Symbol('TRANSCRIPTION_PROVIDER');

export interface TranscriptionSegmentResult {
  speaker: Speaker;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence: number; // 0-1
}

export interface TranscriptionProvider {
  transcribe(durationSeconds: number): Promise<TranscriptionSegmentResult[]>;
}
