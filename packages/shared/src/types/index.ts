// ============================================================
// PHH Inventory — Shared Type Definitions
// ============================================================

import type { UserRole, CuttingType, SheetStatus } from "../constants.js";

// ---- Auth Types ----
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Sheet Types ----
export interface MasterSheet {
  id: string;
  sheetNumber: string;
  grade: string;
  supplier: string;
  length: number;
  width: number;
  thickness: number;
  density: number;
  totalArea: number;
  usedArea: number;
  isManualUsage: boolean;
  scrapArea: number;
  kerfAllowance: number;
  status: SheetStatus;
  notes: string | null;
  shape: string;
  dimensions: unknown | null;
  parentId: string | null;
  createdBy: string;
  lastOpenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SheetWithStats extends MasterSheet {
  availableArea: number;
  usedPercentage: number;
  availablePercentage: number;
  cuttingCount: number;
}

export interface GenealogyNode {
  id: string;
  sheetNumber: string;
  grade: string;
  supplier: string;
  density: number;
  length: number;
  width: number;
  thickness: number;
  totalArea: number;
  usedArea: number;
  scrapArea: number;
  status: SheetStatus;
  parentId: string | null;
  children: GenealogyNode[];
}

export interface CreateSonSheetInput {
  sheetNumber: string;
  length: number;
  width: number;
  thickness: number;
  grade?: string;
  supplier?: string;
  kerfAllowance?: number;
  notes?: string;
}

export interface CreateSheetInput {
  sheetNumber: string;
  grade: string;
  supplier: string;
  length: number;
  width: number;
  thickness: number;
  density: number;
  kerfAllowance?: number;
  notes?: string;
}

export interface UpdateSheetInput {
  grade?: string;
  supplier?: string;
  notes?: string;
  status?: SheetStatus;
  scrapArea?: number;
  usedArea?: number;
  isManualUsage?: boolean;
  length?: number;
  width?: number;
  thickness?: number;
  density?: number;
  kerfAllowance?: number;
}

// ---- Cutting Types ----
export interface RectangleDimensions {
  length: number;
  width: number;
}

export interface CircleDimensions {
  radius: number;
}

export interface TriangleDimensions {
  base: number;
  height: number;
  /** Computed from base + height for bounding box */
  sideA?: number;
  sideB?: number;
  sideC?: number;
}

export type CuttingDimensions =
  | RectangleDimensions
  | CircleDimensions
  | TriangleDimensions;

export interface CuttingOrder {
  id: string;
  sheetId: string;
  jobNumber: string;
  cuttingType: CuttingType;
  dimensions: CuttingDimensions;
  cutArea: number;
  effectiveArea: number;
  positionX: number;
  positionY: number;
  rotation: number;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface CreateCuttingInput {
  jobNumber: string;
  cuttingType: CuttingType;
  dimensions: CuttingDimensions;
  positionX: number;
  positionY: number;
  rotation?: number;
  notes?: string;
}

export interface UpdateCuttingPositionInput {
  positionX: number;
  positionY: number;
  rotation?: number;
}

export interface UpdateCuttingInput {
  jobNumber?: string;
  dimensions?: CuttingDimensions;
  notes?: string;
}

// ---- Group Types ----
export interface SheetGroup {
  id: string;
  name: string;
  description: string | null;
  isPinned: boolean;
  lastOpenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  sheetIds?: string[];
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  isPinned?: boolean;
  sheetIds?: string[];
}

// ---- Collision Types ----
export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---- API Response Types ----
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
