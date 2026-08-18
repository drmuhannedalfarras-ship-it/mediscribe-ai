import { Pagination } from './patient.model';

export interface CreateConsultationDto {
  patientId: string;
  reasonForVisit: string;
  department?: string;
  specialty?: string;
  notes?: string;
}

export type UpdateConsultationDto = Partial<CreateConsultationDto>;

export interface ConsultationResponseDto {
  id: string;
  patientId: string;
  physicianId: string;
  status: string;
  reasonForVisit: string;
  department?: string;
  specialty?: string;
  consultationDate?: string;
  endTime?: string;
  durationSeconds?: number;
  finalizedAt?: string;
  consent?: { status: string };
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationSingleResponse {
  statusCode: number;
  message: string;
  consultation: ConsultationResponseDto;
}

export interface ConsultationListResponse {
  statusCode: number;
  message: string;
  data: ConsultationResponseDto[];
  pagination: Pagination;
}
