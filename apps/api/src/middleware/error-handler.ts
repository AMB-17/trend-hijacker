import { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "@packages/utils";

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

  reply.code(statusCode).send({
    success: false,
    error: {
      message: error.message || "Internal Server Error",
      code: error.code || "INTERNAL_ERROR",
    },
  });
}
