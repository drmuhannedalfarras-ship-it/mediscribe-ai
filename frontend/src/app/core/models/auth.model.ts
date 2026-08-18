export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  status: string;
  specialization?: string;
  licenseNumber?: string;
  department?: string;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  lastPasswordChangeAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  statusCode: number;
  message: string;
  accessToken: string;
  user: UserProfile;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  status: string;
  exp?: number;
  iat?: number;
}

export enum SystemRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLINICAL_ADMIN = 'CLINICAL_ADMIN',
  PHYSICIAN = 'PHYSICIAN',
  NURSE = 'NURSE',
  AUDITOR = 'AUDITOR',
  CLINICAL_GOVERNANCE = 'CLINICAL_GOVERNANCE',
}
