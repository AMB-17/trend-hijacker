export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp?: string;
  traceId?: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface TrendFilters extends PaginationParams {
  userId?: string;
  stage?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?: "score" | "date" | "velocity" | "volume";
  sortOrder?: "asc" | "desc";
}

export interface SearchParams {
  q: string;
  sources?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}
