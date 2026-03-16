export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface HealthStatus {
  status: string;
  database: string;
}

export interface InspectorPublic {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface BuildingTypeDTO {
  id: string;
  nameNl: string;
  nameFr: string;
  active: boolean;
}

export interface ObjectTypeDTO {
  id: string;
  nameNl: string;
  nameFr: string;
  heliOmCategory: string;
  active: boolean;
}

export interface InventorySessionDTO {
  id: string;
  inspectorId: string;
  clientAddress: string;
  buildingTypeId: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  buildingType?: BuildingTypeDTO;
  scanCount?: number;
}

export interface ScanRecordDTO {
  id: string;
  sessionId: string;
  inspectorId: string;
  photoPath: string;
  aiProposedTypeId: string | null;
  aiConfidence: number | null;
  confirmedTypeId: string | null;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  confirmedType?: ObjectTypeDTO | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  inspector: InspectorPublic;
}

export interface CreateSessionRequest {
  clientAddress: string;
  buildingTypeId: string;
}

export interface AiClassificationResult {
  typeId: string;
  confidence: number;
  candidates: Array<{ typeId: string; confidence: number }>;
}

export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const MEDIUM_CONFIDENCE_THRESHOLD = 0.50;
