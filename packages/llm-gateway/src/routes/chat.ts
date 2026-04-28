import type { FastifyInstance } from 'fastify';
import { findModel } from '../providers/registry.js';
import { formatSSEChunk, formatSSEDone, formatSSEError } from '../utils/streaming.js';
import type { ChatMessage } from '@open-antigravity/shared';

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/chat', async (request, reply) => {
    const body = request.body as { model: string; messages: ChatMessage[]; system?: string; max_tokens?: number; temperature?: number; stream?: boolean };
    if (!body?.model || !body?.messages?.length) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'model and messages are required' } });
    }

    const provider = findModel(body.model);
    if (!provider) {
      return reply.status(400).send({
        error: { code: 'MODEL_NOT_FOUND', message: 'Model "' + body.model + '" is not available' },
      });
    }

    const isStreaming = body.stream !== false;
    const opts = { system: body.system, maxTokens: body.max_tokens, temperature: body.temperature };

    try {
      if (isStreaming) {
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        for await (const chunk of provider.chat(body.model, body.messages, opts)) {
          reply.raw.write(formatSSEChunk(chunk));
        }
        reply.raw.write(formatSSEDone());
        reply.raw.end();
        return reply.hijack();
      } else {
        let content = '';
        for await (const chunk of provider.chat(body.model, body.messages, opts)) {
          if (chunk.type === 'text') content += chunk.content || '';
        }
        return reply.send({
          id: 'chatcmpl-' + Date.now(),
          model: body.model,
          choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Provider error';
      if (isStreaming) {
        if (!reply.raw.headersSent) reply.raw.writeHead(502);
        reply.raw.write(formatSSEError(message));
        reply.raw.end();
        return reply.hijack();
      } else {
        return reply.status(502).send({ error: { code: 'UPSTREAM_ERROR', message } });
      }
    }
  });
}
