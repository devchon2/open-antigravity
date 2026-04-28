import type { FastifyInstance } from 'fastify';
import { cfg } from '../config.js';

export function setupAuth(app: FastifyInstance): void {
  app.addHook('onRequest', async (req, reply) => {
    if (req.url === '/api/health') return;
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token || token !== cfg.apiKey) {
      return reply.status(token ? 403 : 401).send({ error: token ? 'Invalid API key' : 'Missing Authorization header' });
    }
  });
}
