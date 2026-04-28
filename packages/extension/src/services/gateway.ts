import * as vscode from 'vscode';

export interface GatewayConfig {
  url: string;
  apiKey: string;
}

function getConfig(): GatewayConfig {
  const config = vscode.workspace.getConfiguration('open-antigravity');
  return {
    url: config.get<string>('gatewayUrl', 'http://localhost:4001'),
    apiKey: config.get<string>('gatewayApiKey', 'antigravity-local-dev-key'),
  };
}

export async function* streamChat(
  model: string,
  messages: Array<{ role: string; content: string | null }>,
  system?: string,
): AsyncIterable<{ type: string; content?: string; toolCall?: unknown }> {
  const cfg = getConfig();

  const response = await fetch(`${cfg.url}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({ model, messages, system, stream: true }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gateway error ${response.status}: ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;
      try {
        yield JSON.parse(data);
      } catch {
        // skip malformed chunks
      }
    }
  }
}

export async function chat(
  model: string,
  messages: Array<{ role: string; content: string | null }>,
  system?: string,
): Promise<string> {
  let result = '';
  for await (const chunk of streamChat(model, messages, system)) {
    if (chunk.type === 'text' && chunk.content) {
      result += chunk.content;
    }
  }
  return result;
}

export async function getModels(): Promise<Array<{ providerId: string; name: string; models: string[] }>> {
  const cfg = getConfig();
  const response = await fetch(`${cfg.url}/api/models`, {
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  });
  if (!response.ok) throw new Error(`Gateway error ${response.status}`);
  const data = await response.json() as { models: Array<{ providerId: string; name: string; models: string[] }> };
  return data.models;
}
