import { Injectable, signal } from '@angular/core';

export class MicPermissionDeniedError extends Error {
  constructor() {
    super('Microphone access denied');
  }
}

@Injectable({ providedIn: 'root' })
export class AudioRecorderService {
  readonly elapsedSeconds = signal(0);
  readonly isRecording = signal(false);

  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  async start(): Promise<void> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      throw new MicPermissionDeniedError();
    }

    this.stream = stream;
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    this.mediaRecorder.start();

    this.startedAt = Date.now();
    this.elapsedSeconds.set(0);
    this.isRecording.set(true);
    this.timer = setInterval(() => {
      this.elapsedSeconds.set(Math.floor((Date.now() - this.startedAt) / 1000));
    }, 1000);
  }

  stop(): Promise<{ blob: Blob; durationMs: number; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
      const durationMs = Date.now() - this.startedAt;

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve({ blob, durationMs, mimeType });
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.isRecording.set(false);
  }
}
