import { ChatRequestSchema } from './schemas.js';
import type { ChatMessage } from './types.js';

export function validateChatRequest(data: unknown):
  | { success: true; data: { model: string; messages: ChatMessage[]; system?: string; stream?: boolean; max_tokens?: number; temperature?: number } }
  | { success: false; error: string } {
  const result = ChatRequestSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as any };
  }
  return { success: false, error: result.error.message };
}
