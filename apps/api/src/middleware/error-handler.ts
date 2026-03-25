import { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "@packages/utils";
import { errorResponse } from "../utils/api-response";

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error("API Error", {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  const statusCode = error.statusCode || 500;

  reply
    .code(statusCode)
    .send(errorResponse(request, error.message || "Internal Server Error", error.code || "INTERNAL_ERROR"));
}
