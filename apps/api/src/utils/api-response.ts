import { FastifyRequest } from "fastify";

export interface ApiMeta {
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  traceId?: string;
}

export function successResponse<T>(data: T, meta?: ApiMeta) {
  return {
    success: true as const,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function errorResponse(
  request: FastifyRequest,
  message: string,
  code: string,
  details?: unknown
) {
  const error: ApiErrorPayload = {
    code,
    message,
    ...(details !== undefined ? { details } : {}),
    timestamp: new Date().toISOString(),
    traceId: request.id,
  };

  return {
    success: false as const,
    error,
  };
}
