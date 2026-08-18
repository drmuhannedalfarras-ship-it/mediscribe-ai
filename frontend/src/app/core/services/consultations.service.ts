import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ConsultationListResponse,
  ConsultationResponseDto,
  ConsultationSingleResponse,
  CreateConsultationDto,
  UpdateConsultationDto,
} from '../models/consultation.model';

@Injectable({ providedIn: 'root' })
export class ConsultationsService {
  private readonly baseUrl = `${environment.apiUrl}/consultations`;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreateConsultationDto): Observable<ConsultationResponseDto> {
    return this.http
      .post<ConsultationSingleResponse>(this.baseUrl, dto)
      .pipe(map((response) => response.consultation));
  }

  listByPatient(patientId: string, skip = 0, take = 25): Observable<ConsultationListResponse> {
    const params = new HttpParams().set('skip', skip).set('take', take);
    return this.http.get<ConsultationListResponse>(`${this.baseUrl}/patient/${patientId}`, { params });
  }

  listByPhysician(physicianId: string, skip = 0, take = 25): Observable<ConsultationListResponse> {
    const params = new HttpParams().set('skip', skip).set('take', take);
    return this.http.get<ConsultationListResponse>(`${this.baseUrl}/physician/${physicianId}`, {
      params,
    });
  }

  getById(id: string): Observable<ConsultationResponseDto> {
    return this.http
      .get<ConsultationSingleResponse>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.consultation));
  }

  update(id: string, dto: UpdateConsultationDto): Observable<ConsultationResponseDto> {
    return this.http
      .put<ConsultationSingleResponse>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.consultation));
  }

  start(id: string): Observable<ConsultationResponseDto> {
    return this.http
      .put<ConsultationSingleResponse>(`${this.baseUrl}/${id}/start`, {})
      .pipe(map((response) => response.consultation));
  }

  cancel(id: string): Observable<ConsultationResponseDto> {
    return this.http
      .put<ConsultationSingleResponse>(`${this.baseUrl}/${id}/cancel`, {})
      .pipe(map((response) => response.consultation));
  }

  beginReview(id: string): Observable<ConsultationResponseDto> {
    return this.http
      .put<ConsultationSingleResponse>(`${this.baseUrl}/${id}/review/begin`, {})
      .pipe(map((response) => response.consultation));
  }

  finalize(id: string): Observable<ConsultationResponseDto> {
    return this.http
      .put<ConsultationSingleResponse>(`${this.baseUrl}/${id}/review/finalize`, {})
      .pipe(map((response) => response.consultation));
  }

  sendBackForRerecording(id: string): Observable<ConsultationResponseDto> {
    return this.http
      .put<ConsultationSingleResponse>(`${this.baseUrl}/${id}/review/send-back`, {})
      .pipe(map((response) => response.consultation));
  }
}
