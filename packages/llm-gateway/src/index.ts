import Fastify from 'fastify';
import cors from '@fastify/cors';
import { cfg } from './config.js';
import { setupAuth } from './middleware/auth.js';
import { setupErrorHandler } from './middleware/error.js';
import { healthRoutes } from './routes/health.js';
import { modelsRoutes } from './routes/models.js';
import { chatRoutes } from './routes/chat.js';

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });

  setupAuth(app);
  setupErrorHandler(app);

  // Root landing page
  app.get('/', async (_req, reply) => {
    return reply.type('text/html').send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Open-Antigravity Gateway</title>
<style>body{font-family:sans-serif;max-width:600px;margin:60px auto;padding:20px;background:#0d1117;color:#e6edf3}h1{color:#58a6ff}code{background:#161b22;padding:2px 6px;border-radius:4px}a{color:#58a6ff}</style></head>
<body>
<h1>Open-Antigravity Gateway</h1>
<p>Universal LLM API router — OpenAI, Anthropic, Google, Ollama.</p>
<h2>Endpoints</h2>
<ul>
<li><code>GET /api/health</code> — Server status</li>
<li><code>GET /api/models</code> — Available models</li>
<li><code>POST /api/chat</code> — Streaming chat completions</li>
</ul>
<p>Dashboard: <a href="http://localhost:3000">localhost:3000</a></p>
</body></html>`);
  });

  await app.register(healthRoutes);
  await app.register(modelsRoutes);
  await app.register(chatRoutes);

  try {
    const address = await app.listen({ port: cfg.port, host: '0.0.0.0' });
    app.log.info('Gateway ready at ' + address);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
