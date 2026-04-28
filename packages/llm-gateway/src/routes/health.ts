import type { FastifyInstance } from 'fastify';
import { getProviders } from '../providers/registry.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      version: '0.1.0',
      providers: getProviders().map(function(p) { return p.providerId; }),
    });
  });
}
