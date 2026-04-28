import type { StreamChunk } from '@open-antigravity/shared';

export function formatSSEChunk(chunk: StreamChunk): string {
  return 'data: ' + JSON.stringify(chunk) + '\n\n';
}

export function formatSSEDone(): string {
  return 'data: [DONE]\n\n';
}

export function formatSSEError(message: string): string {
  return 'data: ' + JSON.stringify({ error: { message } }) + '\n\n';
}
