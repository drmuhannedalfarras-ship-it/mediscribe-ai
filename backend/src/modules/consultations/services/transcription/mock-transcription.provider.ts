import { Injectable } from '@nestjs/common';
import { Speaker } from '@entities/transcript-segment.entity';
import {
  TranscriptionProvider,
  TranscriptionSegmentResult,
} from './transcription-provider.interface';

interface ExchangeLine {
  speaker: Speaker;
  text: string;
}

const EXCHANGE_POOL: ExchangeLine[] = [
  { speaker: Speaker.PHYSICIAN, text: 'Good morning, what brings you in today?' },
  { speaker: Speaker.PATIENT, text: "I've had a headache and some fatigue for the past three days." },
  { speaker: Speaker.PHYSICIAN, text: 'Have you noticed any fever, nausea, or sensitivity to light?' },
  { speaker: Speaker.PATIENT, text: 'A little sensitivity to light, but no fever or nausea.' },
  { speaker: Speaker.PHYSICIAN, text: 'Are you currently taking any medications?' },
  { speaker: Speaker.PATIENT, text: 'Just an occasional over-the-counter pain reliever.' },
  { speaker: Speaker.PHYSICIAN, text: 'How has your sleep and stress level been lately?' },
  { speaker: Speaker.PATIENT, text: "Sleep has been poor, and work has been quite stressful." },
  { speaker: Speaker.PHYSICIAN, text: "Let's check your vitals and do a quick examination." },
  { speaker: Speaker.PATIENT, text: 'Okay, sounds good.' },
  { speaker: Speaker.PHYSICIAN, text: 'Your vitals look normal. This looks like a tension headache related to stress and sleep.' },
  { speaker: Speaker.PHYSICIAN, text: "I'd recommend better sleep hygiene, hydration, and follow up if symptoms worsen." },
];

@Injectable()
export class MockTranscriptionProvider implements TranscriptionProvider {
  async transcribe(durationSeconds: number): Promise<TranscriptionSegmentResult[]> {
    const lineCount = Math.min(
      EXCHANGE_POOL.length,
      Math.max(2, Math.floor(durationSeconds / 5)),
    );
    const startIndex = Math.floor(Math.random() * (EXCHANGE_POOL.length - lineCount + 1));
    const lines = EXCHANGE_POOL.slice(startIndex, startIndex + lineCount);

    const segmentDuration = durationSeconds / lines.length;

    return lines.map((line, index) => ({
      speaker: line.speaker,
      text: line.text,
      startTime: Math.round(index * segmentDuration * 100) / 100,
      endTime: Math.round((index + 1) * segmentDuration * 100) / 100,
      confidence: Math.round((0.85 + Math.random() * 0.14) * 100) / 100,
    }));
  }
}
