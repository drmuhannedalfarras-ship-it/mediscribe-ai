import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePatientDto,
  PatientListResponse,
  PatientResponseDto,
  PatientSingleResponse,
  UpdatePatientDto,
} from '../models/patient.model';

@Injectable({ providedIn: 'root' })
export class PatientsService {
  private readonly baseUrl = `${environment.apiUrl}/patients`;

  constructor(private readonly http: HttpClient) {}

  create(dto: CreatePatientDto): Observable<PatientResponseDto> {
    return this.http
      .post<PatientSingleResponse>(this.baseUrl, dto)
      .pipe(map((response) => response.patient));
  }

  list(skip = 0, take = 25, status?: string): Observable<PatientListResponse> {
    let params = new HttpParams().set('skip', skip).set('take', take);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<PatientListResponse>(this.baseUrl, { params });
  }

  getById(id: string): Observable<PatientResponseDto> {
    return this.http
      .get<PatientSingleResponse>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.patient));
  }

  update(id: string, dto: UpdatePatientDto): Observable<PatientResponseDto> {
    return this.http
      .put<PatientSingleResponse>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.patient));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
