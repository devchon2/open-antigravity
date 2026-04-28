import 'dotenv/config';

export const cfg = {
  port: parseInt(process.env.GATEWAY_PORT || '4001', 10),
  apiKey: process.env.GATEWAY_API_KEY || 'antigravity-local-dev-key',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
};

export const providerKeys = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  },
};
