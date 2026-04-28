/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Gateway Client
 *  Thin wrapper around LLMRouter. Calls LLM APIs directly from the IDE process.
 *  Optional: can fall back to standalone gateway for remote/shared use.
 *--------------------------------------------------------------------------------------------*/

import { llmRouter, type ModelInfo } from './LLMRouter.js';

export class GatewayClient {
  private useRemoteGateway: boolean;
  private remoteUrl: string;

  constructor(remoteUrl?: string) {
    this.remoteUrl = remoteUrl || '';
    // Use embedded router by default (no separate gateway needed)
    this.useRemoteGateway = false;
  }

  /** Stream a chat completion — calls LLM APIs directly from the IDE */
  async *streamChat(
    model: string,
    messages: Array<{ role: string; content: string | null; tool_call_id?: string }>,
    systemPrompt?: string,
  ): AsyncIterable<{ type: string; content?: string; toolCall?: any }> {
    if (this.useRemoteGateway && this.remoteUrl) {
      // Optional: fallback to standalone gateway
      yield* this.streamRemote(model, messages, systemPrompt);
      return;
    }
    // Default: embedded LLM routing — calls OpenAI/Anthropic/Google/Ollama directly
    yield* llmRouter.streamChat(model, messages as any, systemPrompt);
  }

  /** List available models from embedded router */
  getModels(): ModelInfo[] {
    return llmRouter.listModels();
  }

  /** Enable remote gateway mode (for headless/shared deployments) */
  enableRemote(url: string = 'http://localhost:4001'): void {
    this.remoteUrl = url;
    this.useRemoteGateway = true;
  }

  /** Use embedded routing (default) */
  enableEmbedded(): void {
    this.useRemoteGateway = false;
  }

  private async *streamRemote(
    model: string,
    messages: Array<{ role: string; content: string | null }>,
    systemPrompt?: string,
  ): AsyncIterable<{ type: string; content?: string }> {
    const resp = await fetch(`${this.remoteUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer open-antigravity-dev-key' },
      body: JSON.stringify({ model, messages, system: systemPrompt, stream: true }),
    });
    if (!resp.ok) throw new Error(`Gateway error ${resp.status}`);
    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No body');
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
}
