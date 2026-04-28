import type { FastifyInstance } from 'fastify';
import { cfg } from '../config.js';

export function setupAuth(app: FastifyInstance): void {
  app.addHook('onRequest', async (req, reply) => {
    // Public endpoints
    if (req.url === '/api/health' || req.url === '/' || req.url === '/favicon.ico') return;

    // In dev mode with no API key set, allow all local requests
    if (!cfg.apiKey || cfg.apiKey === 'antigravity-local-dev-key') {
      const origin = req.headers['origin'] || req.headers['host'] || '';
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('172.') || origin.includes('192.168.')) {
        return;
      }
    }

    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token || token !== cfg.apiKey) {
      return reply.status(token ? 403 : 401).send({ error: token ? 'Invalid API key' : 'Missing Authorization header' });
    }
  });
}
