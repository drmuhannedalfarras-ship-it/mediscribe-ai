import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ConsultationsService } from '../../../core/services/consultations.service';
import { AudioService } from '../../../core/services/audio.service';
import { AudioRecorderService, MicPermissionDeniedError } from '../../../core/services/audio-recorder.service';
import { ConsultationResponseDto } from '../../../core/models/consultation.model';
import { TranscriptSegmentDto } from '../../../core/models/audio.model';

type RecordingState = 'idle' | 'recording' | 'uploading' | 'done' | 'error';

@Component({
  selector: 'app-consultation-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './consultation-detail.component.html',
})
export class ConsultationDetailComponent implements OnInit, OnDestroy {
  consultation: ConsultationResponseDto | null = null;
  loading = true;
  actionPending = false;

  hasConsent = false;
  consentPending = false;
  consentError: string | null = null;
  recordingState: RecordingState = 'idle';
  recordingError: string | null = null;
  transcript: TranscriptSegmentDto[] | null = null;
  audioObjectUrl: string | null = null;

  readonly audioRecorder = this.audioRecorderService;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly consultationsService: ConsultationsService,
    private readonly audioService: AudioService,
    private readonly audioRecorderService: AudioRecorderService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    if (this.audioObjectUrl) {
      URL.revokeObjectURL(this.audioObjectUrl);
    }
  }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loading = true;
    this.consultationsService.getById(id).subscribe({
      next: (consultation) => {
        this.consultation = consultation;
        this.hasConsent = consultation.consent?.status === 'GIVEN';
        this.loading = false;
        this.loadTranscriptIfNeeded();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadTranscriptIfNeeded(): void {
    if (!this.consultation || !this.isReviewStage) {
      return;
    }
    this.audioService.getTranscript(this.consultation.id).subscribe({
      next: (transcript) => {
        this.transcript = transcript;
      },
    });
  }

  startConsultation(): void {
    if (!this.consultation) {
      return;
    }
    this.actionPending = true;
    this.consultationsService.start(this.consultation.id).subscribe({
      next: (consultation) => {
        this.consultation = consultation;
        this.actionPending = false;
      },
      error: () => {
        this.actionPending = false;
      },
    });
  }

  cancelConsultation(): void {
    if (!this.consultation) {
      return;
    }
    this.actionPending = true;
    this.consultationsService.cancel(this.consultation.id).subscribe({
      next: (consultation) => {
        this.consultation = consultation;
        this.actionPending = false;
      },
      error: () => {
        this.actionPending = false;
      },
    });
  }

  grantConsent(): void {
    if (!this.consultation) {
      return;
    }
    this.consentPending = true;
    const finishGrant = () => {
      this.audioService.grantConsent(this.consultation!.id).subscribe({
        next: () => {
          this.hasConsent = true;
          this.consentPending = false;
        },
        error: (error: HttpErrorResponse) => {
          this.consentPending = false;
          this.consentError = error.error?.message || 'Could not grant consent. Please try again.';
        },
      });
    };

    this.consentError = null;
    this.audioService.requestConsent(this.consultation.id).subscribe({
      // A consent record may already exist from a previous attempt (e.g. after
      // a retry) — that's fine, just proceed to grant it rather than failing.
      next: finishGrant,
      error: finishGrant,
    });
  }

  async startRecording(): Promise<void> {
    if (!this.consultation) {
      return;
    }

    this.recordingError = null;

    try {
      await new Promise<void>((resolve, reject) => {
        this.audioService.startRecordingSession(this.consultation!.id).subscribe({
          next: () => resolve(),
          error: (error) => reject(error),
        });
      });

      await this.audioRecorderService.start();
      this.recordingState = 'recording';
    } catch (error) {
      if (error instanceof MicPermissionDeniedError) {
        this.recordingError = 'Microphone access denied — check your browser permissions.';
      } else {
        this.recordingError = 'Could not start recording. Please try again.';
      }
      this.recordingState = 'error';
    }
  }

  async stopRecording(): Promise<void> {
    if (!this.consultation) {
      return;
    }

    this.recordingState = 'uploading';
    this.recordingError = null;

    try {
      const { blob, durationMs } = await this.audioRecorderService.stop();

      this.audioService.uploadAudio(this.consultation.id, blob, durationMs).subscribe({
        next: (response) => {
          this.transcript = response.transcript;
          this.recordingState = 'done';
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.recordingError =
            error.error?.message || 'Upload failed. Please try again.';
          this.recordingState = 'error';
        },
      });
    } catch {
      this.recordingError = 'Could not stop recording. Please try again.';
      this.recordingState = 'error';
    }
  }

  playAudio(): void {
    if (!this.consultation) {
      return;
    }
    this.audioService.getAudioBlob(this.consultation.id).subscribe({
      next: (blob) => {
        if (this.audioObjectUrl) {
          URL.revokeObjectURL(this.audioObjectUrl);
        }
        this.audioObjectUrl = URL.createObjectURL(blob);
      },
    });
  }

  get showRecordingCard(): boolean {
    if (!this.consultation) {
      return false;
    }
    return [
      'IN_PROGRESS',
      'PROCESSING',
      'AI_REVIEW_READY',
      'PHYSICIAN_REVIEW',
      'FINALIZED',
      'AMENDED',
    ].includes(this.consultation.status);
  }

  get isReviewStage(): boolean {
    if (!this.consultation) {
      return false;
    }
    return ['AI_REVIEW_READY', 'PHYSICIAN_REVIEW', 'FINALIZED', 'AMENDED'].includes(
      this.consultation.status,
    );
  }

  beginReview(): void {
    if (!this.consultation) {
      return;
    }
    this.actionPending = true;
    this.consultationsService.beginReview(this.consultation.id).subscribe({
      next: (consultation) => {
        this.consultation = consultation;
        this.actionPending = false;
      },
      error: () => {
        this.actionPending = false;
      },
    });
  }

  finalizeConsultation(): void {
    if (!this.consultation) {
      return;
    }
    this.actionPending = true;
    this.consultationsService.finalize(this.consultation.id).subscribe({
      next: (consultation) => {
        this.consultation = consultation;
        this.actionPending = false;
      },
      error: () => {
        this.actionPending = false;
      },
    });
  }

  sendBackForRerecording(): void {
    if (!this.consultation) {
      return;
    }
    this.actionPending = true;
    this.consultationsService.sendBackForRerecording(this.consultation.id).subscribe({
      next: (consultation) => {
        this.consultation = consultation;
        this.transcript = null;
        this.recordingState = 'idle';
        this.actionPending = false;
      },
      error: () => {
        this.actionPending = false;
      },
    });
  }
}
