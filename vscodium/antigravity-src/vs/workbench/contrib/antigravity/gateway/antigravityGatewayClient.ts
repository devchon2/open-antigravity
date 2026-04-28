/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Gateway Client
 *  SSE streaming client to the Open-Antigravity LLM Gateway (Fastify backend).
 *--------------------------------------------------------------------------------------------*/

export interface GatewayModel {
  id: string; name: string; provider: string;
}

export class AntigravityGatewayClient {
  constructor(
    private baseUrl: string = 'http://localhost:4001',
    private apiKey: string = 'antigravity-local-dev-key',
  ) {}

  async *streamChat(
    model: string,
    messages: Array<{ role: string; content: string | null; tool_call_id?: string }>,
    systemPrompt?: string,
  ): AsyncIterable<{ type: string; content?: string; toolCall?: any }> {
    const resp = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model, messages, system: systemPrompt, stream: true }),
    });
    if (!resp.ok) throw new Error(`Gateway error ${resp.status}`);
    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No response body');
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const l of lines) {
        if (!l.startsWith('data: ')) continue;
        const d = l.slice(6).trim();
        if (!d || d === '[DONE]') continue;
        try { yield JSON.parse(d); } catch {}
      }
    }
  }

  async getModels(): Promise<GatewayModel[]> {
    const resp = await fetch(`${this.baseUrl}/api/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!resp.ok) throw new Error(`Gateway error ${resp.status}`);
    const data = (await resp.json()) as { models: Array<{ providerId: string; name: string; models: string[] }> };
    return data.models.flatMap((p) => p.models.map((m) => ({ id: m, name: m, provider: p.name })));
  }
}
