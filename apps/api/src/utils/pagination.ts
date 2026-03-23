/**
 * Pagination Parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number; // Alternative to offset
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    page?: number;
    totalPages?: number;
  };
}

/**
 * Parse pagination parameters from query
 */
export function parsePaginationParams(query: any): {
  limit: number;
  offset: number;
} {
  const limit = Math.min(
    Math.max(parseInt(query.limit) || 20, 1),
    100 // Max 100 items per page
  );

  let offset = Math.max(parseInt(query.offset) || 0, 0);

  // Support page-based pagination
  if (query.page) {
    const page = Math.max(parseInt(query.page) || 1, 1);
    offset = (page - 1) * limit;
  }

  return { limit, offset };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  const hasMore = offset + data.length < total;
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      limit,
      offset,
      hasMore,
      page,
      totalPages,
    },
  };
}

/**
 * Cursor-based Pagination Parameters
 */
export interface CursorPaginationParams {
  limit?: number;
  cursor?: string; // Typically an ID or timestamp
}

/**
 * Cursor-based Paginated Response
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

/**
 * Parse cursor pagination parameters
 */
export function parseCursorParams(query: any): {
  limit: number;
  cursor?: string;
} {
  const limit = Math.min(
    Math.max(parseInt(query.limit) || 20, 1),
    100
  );

  const cursor = query.cursor || undefined;

  return { limit, cursor };
}

/**
 * Create cursor-based paginated response
 */
export function createCursorPaginatedResponse<T extends { id: string }>(
  data: T[],
  limit: number
): CursorPaginatedResponse<T> {
  // Check if there are more results (we fetched limit + 1)
  const hasMore = data.length > limit;

  // If we have more, remove the extra item and use its ID as next cursor
  const resultData = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? data[limit].id : undefined;

  return {
    data: resultData,
    meta: {
      limit,
      hasMore,
      nextCursor,
    },
  };
}

/**
 * Sorting Parameters
 */
export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Parse sorting parameters
 */
export function parseSortParams(
  query: any,
  allowedFields: string[] = [],
  defaultField: string = "createdAt"
): SortParams {
  let sortBy = query.sortBy || defaultField;

  // Validate sortBy field
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    sortBy = defaultField;
  }

  const sortOrder =
    query.sortOrder?.toLowerCase() === "asc" ? "asc" : "desc";

  return { sortBy, sortOrder };
}

/**
 * Convert sort params to Prisma orderBy
 */
export function toPrismaOrderBy(sortParams: SortParams): Record<string, "asc" | "desc"> {
  return {
    [sortParams.sortBy || "createdAt"]: sortParams.sortOrder || "desc",
  };
}

/**
 * Filtering Parameters
 */
export interface FilterParams {
  [key: string]: any;
}

/**
 * Parse filter parameters
 */
export function parseFilterParams(
  query: any,
  allowedFilters: string[] = []
): FilterParams {
  const filters: FilterParams = {};

  for (const key of allowedFilters) {
    if (query[key] !== undefined && query[key] !== "") {
      filters[key] = query[key];
    }
  }

  return filters;
}

/**
 * Numeric range filter
 */
export interface NumericRangeFilter {
  min?: number;
  max?: number;
}

/**
 * Parse numeric range (e.g., minScore, maxScore)
 */
export function parseNumericRange(
  query: any,
  prefix: string
): NumericRangeFilter {
  const range: NumericRangeFilter = {};

  const min = query[`${prefix}Min`] || query[`min${capitalize(prefix)}`];
  const max = query[`${prefix}Max`] || query[`max${capitalize(prefix)}`];

  if (min !== undefined) {
    range.min = parseFloat(min);
  }

  if (max !== undefined) {
    range.max = parseFloat(max);
  }

  return range;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  from?: Date;
  to?: Date;
}

/**
 * Parse date range
 */
export function parseDateRange(
  query: any,
  prefix: string = "date"
): DateRangeFilter {
  const range: DateRangeFilter = {};

  const from = query[`${prefix}From`] || query.from;
  const to = query[`${prefix}To`] || query.to;

  if (from) {
    range.from = new Date(from);
  }

  if (to) {
    range.to = new Date(to);
  }

  return range;
}

/**
 * Helper: Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
