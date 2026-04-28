import type { FastifyInstance } from 'fastify';
import { getProviders } from '../providers/registry.js';

export async function modelsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/models', async (_req, reply) => {
    const models = getProviders().map(function(p) {
      return { providerId: p.providerId, name: p.name, models: p.listModels() };
    });
    return reply.send({ models });
  });
}
