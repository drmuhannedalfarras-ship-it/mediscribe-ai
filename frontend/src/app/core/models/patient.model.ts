export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  NOT_SPECIFIED = 'NOT_SPECIFIED',
}

export enum PatientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DECEASED = 'DECEASED',
}

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  nationality?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  familyHistory?: string;
  socialHistory?: string;
  smokingStatus?: string;
}

export type UpdatePatientDto = Partial<CreatePatientDto> & { status?: PatientStatus };

export interface PatientResponseDto {
  id: string;
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  emergencyContact?: string;
  status: PatientStatus;
  bloodType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  skip: number;
  take: number;
  total: number;
}

export interface PatientSingleResponse {
  statusCode: number;
  message: string;
  patient: PatientResponseDto;
}

export interface PatientListResponse {
  statusCode: number;
  message: string;
  data: PatientResponseDto[];
  pagination: Pagination;
}
