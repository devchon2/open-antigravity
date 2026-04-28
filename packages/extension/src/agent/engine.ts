import * as vscode from 'vscode';
import { streamChat } from '../services/gateway.js';
import { executeTool, TOOL_DEFINITIONS } from './tools.js';
import { SYSTEM_PROMPT, PLANNING_MODE_PROMPT, FAST_MODE_PROMPT } from '@open-antigravity/shared';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export class AgentEngine {
  private messages: AgentMessage[] = [];
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  reset(): void {
    this.messages = [];
  }

  getConversation(): AgentMessage[] {
    return [...this.messages];
  }

  async *run(userMessage: string, mode: 'fast' | 'planning' = 'fast'): AsyncIterable<string> {
    const config = vscode.workspace.getConfiguration('open-antigravity');
    this.model = config.get<string>('defaultModel', 'gpt-4o');

    let systemPrompt = SYSTEM_PROMPT;
    if (mode === 'planning') {
      systemPrompt += '\n\n' + PLANNING_MODE_PROMPT;
    } else {
      systemPrompt += '\n\n' + FAST_MODE_PROMPT;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length) {
      systemPrompt += `\n\n## Current Workspace\nRoot: ${workspaceFolders[0].uri.fsPath}`;
    }

    this.messages.push({ role: 'user', content: userMessage });

    const gatewayMessages = this.messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.toolCalls ? { tool_calls: m.toolCalls.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })) } : {}),
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
    }));

    let fullResponse = '';

    for await (const chunk of streamChat(this.model, gatewayMessages as any[], systemPrompt)) {
      if (chunk.type === 'text' && chunk.content) {
        fullResponse += chunk.content;
        yield chunk.content;
      }

      if (chunk.type === 'tool_call' && chunk.toolCall) {
        yield '\n\n**Tool:** ' + (chunk.toolCall as any).function.name + '\n';

        const tc = chunk.toolCall as { id: string; type: 'function'; function: { name: string; arguments: string } };
        const args = JSON.parse(tc.function.arguments);
        const result = await executeTool(tc.function.name, args);

        this.messages.push({
          role: 'assistant',
          content: null,
          toolCalls: [tc],
        });
        this.messages.push({
          role: 'tool',
          toolCallId: tc.id,
          content: result.error || result.content,
        });

        yield result.error ? `\n⚠️ ${result.error}\n` : `\n✅ Done\n`;

        // Recurse: send the tool result back to the model for continuation
        const followupMessages = this.messages.map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.toolCalls ? { tool_calls: m.toolCalls.map((t) => ({
            id: t.id,
            type: t.type,
            function: { name: t.function.name, arguments: t.function.arguments },
          })) } : {}),
          ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
        }));

        for await (const fChunk of streamChat(this.model, followupMessages as any[], systemPrompt)) {
          if (fChunk.type === 'text' && fChunk.content) {
            fullResponse += fChunk.content;
            yield fChunk.content;
          }
        }
      }
    }

    this.messages.push({ role: 'assistant', content: fullResponse });
    yield '[DONE]';
  }
}
