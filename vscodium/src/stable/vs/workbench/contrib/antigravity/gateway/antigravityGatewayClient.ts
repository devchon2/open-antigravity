let config = { url: 'http://localhost:4001', apiKey: 'antigravity-local-dev-key' };
export function setGatewayConfig(c: Partial<typeof config>) { config = { ...config, ...c }; }

export async function* streamChat(
  model: string,
  messages: Array<{ role: string; content: string | null }>,
  system?: string,
): AsyncIterable<{ type: string; content?: string; toolCall?: unknown }> {
  const resp = await fetch(`${config.url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model, messages, system, stream: true }),
  });
  if (!resp.ok) throw new Error(`Gateway error ${resp.status}`);
  const reader = resp.body?.getReader();
  if (!reader) throw new Error('No body');
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const l of lines) {
      if (!l.startsWith('data: ')) continue;
      const d = l.slice(6).trim();
      if (!d || d === '[DONE]') continue;
      try { yield JSON.parse(d); } catch {/* skip */}
    }
  }
}
