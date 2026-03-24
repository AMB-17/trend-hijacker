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
export function parsePaginationParams(query: Record<string, unknown>): {
  limit: number;
  offset: number;
} {
  const limitValue = toStringValue(query.limit);
  const offsetValue = toStringValue(query.offset);
  const pageValue = toStringValue(query.page);

  const limit = Math.min(
    Math.max(parseInt(limitValue ?? "20", 10) || 20, 1),
    100 // Max 100 items per page
  );

  let offset = Math.max(parseInt(offsetValue ?? "0", 10) || 0, 0);

  // Support page-based pagination
  if (pageValue) {
    const page = Math.max(parseInt(pageValue, 10) || 1, 1);
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
export function parseCursorParams(query: Record<string, unknown>): {
  limit: number;
  cursor?: string;
} {
  const limitValue = toStringValue(query.limit);
  const limit = Math.min(
    Math.max(parseInt(limitValue ?? "20", 10) || 20, 1),
    100
  );

  const cursor = toStringValue(query.cursor);

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
  query: Record<string, unknown>,
  allowedFields: string[] = [],
  defaultField: string = "createdAt"
): SortParams {
  let sortBy = toStringValue(query.sortBy) ?? defaultField;

  // Validate sortBy field
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    sortBy = defaultField;
  }

  const rawSortOrder = toStringValue(query.sortOrder)?.toLowerCase();
  const sortOrder = rawSortOrder === "asc" ? "asc" : "desc";

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
  [key: string]: unknown;
}

/**
 * Parse filter parameters
 */
export function parseFilterParams(
  query: Record<string, unknown>,
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
  query: Record<string, unknown>,
  prefix: string
): NumericRangeFilter {
  const range: NumericRangeFilter = {};

  const min = query[`${prefix}Min`] || query[`min${capitalize(prefix)}`];
  const max = query[`${prefix}Max`] || query[`max${capitalize(prefix)}`];
  const minValue = toStringValue(min);
  const maxValue = toStringValue(max);

  if (minValue !== undefined) {
    range.min = parseFloat(minValue);
  }

  if (maxValue !== undefined) {
    range.max = parseFloat(maxValue);
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
  query: Record<string, unknown>,
  prefix: string = "date"
): DateRangeFilter {
  const range: DateRangeFilter = {};

  const from = query[`${prefix}From`] || query.from;
  const to = query[`${prefix}To`] || query.to;
  const fromValue = toDateInput(from);
  const toValue = toDateInput(to);

  if (fromValue !== undefined) {
    range.from = new Date(fromValue);
  }

  if (toValue !== undefined) {
    range.to = new Date(toValue);
  }

  return range;
}

/**
 * Helper: Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function toDateInput(value: unknown): string | number | Date | undefined {
  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    return value;
  }
  return undefined;
}
