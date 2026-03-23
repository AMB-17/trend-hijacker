import Fastify from 'fastify';

export async function createFastifyServer() {
  const fastify = Fastify({
    logger: true,
    requestTimeout: 30000,
  });

  // Register plugins
  await fastify.register(require('@fastify/cors'), {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  await fastify.register(require('@fastify/helmet'));

  await fastify.register(require('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '15 minutes',
  });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Ready state
  fastify.get('/ready', async () => {
    return { ready: true };
  });

  return fastify;
}

/**
 * Start server
 */
export async function startServer(fastify: Awaited<ReturnType<typeof createFastifyServer>>) {
  const port = parseInt(process.env.PORT || '3000');
  const host = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    console.log(`✅ Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
