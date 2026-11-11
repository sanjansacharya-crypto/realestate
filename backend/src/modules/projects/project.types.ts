import { ProjectStatus, ProjectType, AreaUnit } from '@prisma/client';

// ---------------------------------------------------------------------------
// DTOs (Data Transfer Objects) — shapes of incoming request bodies
// ---------------------------------------------------------------------------

export interface CreateProjectDTO {
  name: string;
  code: string;
  description?: string;
  projectType?: ProjectType;
  status?: ProjectStatus;
  reraNumber?: string;
  address?: string;
  city: string;
  state: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  totalArea?: number;
  areaUnit?: AreaUnit;
  expectedStartDate?: string; // ISO date string from client
  expectedCompletionDate?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  code?: string;
  description?: string;
  projectType?: ProjectType;
  status?: ProjectStatus;
  reraNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  totalArea?: number;
  areaUnit?: AreaUnit;
  expectedStartDate?: string;
  expectedCompletionDate?: string;
  actualCompletionDate?: string;
}

export interface ProjectListQuery {
  status?: ProjectStatus;
  projectType?: ProjectType;
  search?: string;
  page?: number;
  limit?: number;
}

