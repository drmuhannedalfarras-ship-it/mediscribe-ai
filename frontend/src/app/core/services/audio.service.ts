import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AudioSessionDto, AudioUploadResponse, TranscriptSegmentDto } from '../models/audio.model';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly baseUrl = `${environment.apiUrl}/consultations`;

  constructor(private readonly http: HttpClient) {}

  startRecordingSession(consultationId: string): Observable<AudioSessionDto> {
    return this.http
      .post<{ audioSession: AudioSessionDto }>(`${this.baseUrl}/${consultationId}/audio/start`, {})
      .pipe(map((response) => response.audioSession));
  }

  uploadAudio(
    consultationId: string,
    blob: Blob,
    durationMs: number,
  ): Observable<AudioUploadResponse> {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('duration', String(durationMs));

    return this.http.post<AudioUploadResponse>(
      `${this.baseUrl}/${consultationId}/audio/upload`,
      formData,
    );
  }

  getTranscript(consultationId: string): Observable<TranscriptSegmentDto[]> {
    return this.http
      .get<{ data: TranscriptSegmentDto[] }>(`${this.baseUrl}/${consultationId}/transcript`, {
        params: { skip: '0', take: '100' },
      })
      .pipe(map((response) => response.data));
  }

  getAudioBlob(consultationId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${consultationId}/audio/file`, {
      responseType: 'blob',
    });
  }

  requestConsent(consultationId: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${consultationId}/consent/request`, {
      consentTypes: ['AUDIO_RECORDING'],
    });
  }

  grantConsent(consultationId: string): Observable<unknown> {
    return this.http.put(`${this.baseUrl}/${consultationId}/consent/grant`, {});
  }
}
