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
