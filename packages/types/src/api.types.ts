export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

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
