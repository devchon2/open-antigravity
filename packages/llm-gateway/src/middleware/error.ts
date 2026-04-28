import type { FastifyInstance } from 'fastify';

export function setupErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    app.log.error(err);
    const statusCode = err.statusCode || 500;
    return reply.status(statusCode).send({
      error: statusCode === 500 ? 'Internal Server Error' : err.message,
    });
  });
}
