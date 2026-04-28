/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Agent Engine
 *  Plan -> Approve -> Execute -> Verify loop. Integrated into VSCodium workbench.
 *  Calls LLM APIs directly from the IDE process — no separate gateway service.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../../base/common/event.js';
import { llmRouter, type ChatMessage as RouterMessage, type StreamChunk } from '../gateway/LLMRouter.js';

export type AgentMode = 'fast' | 'planning';
export type AgentStatus = 'idle' | 'planning' | 'executing' | 'verifying' | 'done' | 'error';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

interface StreamChunk {
  type: 'text' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: { id: string; type: 'function'; function: { name: string; arguments: string } };
}

const SYSTEM_PROMPT = `You are an autonomous coding agent inside Open-IDE.
## Capabilities
- Read, write, edit files (exact string replacement)
- Execute terminal commands
- List directories and search codebase
- Interact with a web browser (navigate, click, type, screenshot)
- Create structured plans before executing
- Produce verifiable artifacts (diffs, screenshots, test results)
## Guidelines
1. Understand the codebase before making changes
2. Plan complex tasks before executing
3. Use edit_file for targeted changes (prefer over write_file)
4. Verify changes by running tests
5. Present results clearly with diffs and explanations`;

export class AgentEngine {
  private _status: AgentStatus = 'idle';
  private messages: ChatMessage[] = [];
  private model: string;
  private runId: string = '';
  // LLM routing is embedded in the IDE — no separate gateway needed

  private readonly _onChunk = new Emitter<string>();
  readonly onChunk = this._onChunk.event;
  private readonly _onStatusChange = new Emitter<AgentStatus>();
  readonly onStatusChange = this._onStatusChange.event;

  constructor(model: string = 'gpt-4o') {
    this.model = model;
  }

  get status(): AgentStatus { return this._status; }
  reset(): void { this.messages = []; this._status = 'idle'; this._onStatusChange.fire('idle'); }

  async *run(userMessage: string, mode: AgentMode = 'fast'): AsyncIterable<string> {
    this._status = mode === 'planning' ? 'planning' : 'executing';
    this._onStatusChange.fire(this._status);
    this.runId = crypto.randomUUID();

    let systemPrompt = SYSTEM_PROMPT;
    systemPrompt += mode === 'planning'
      ? '\n\nYou are in PLANNING mode. Outline steps before executing.'
      : '\n\nYou are in FAST mode. Execute directly and efficiently.';
    systemPrompt += '\n\n## Available Tools\n- read_file: Read file contents\n- write_file: Write content to a file\n- edit_file: Replace exact string in file\n- list_directory: List directory contents\n- execute_command: Execute shell command\n- search_codebase: Search workspace files with regex\n- browser_action: Interact with web browser';

    this.messages.push({ role: 'user', content: userMessage });

    let fullResponse = '';
    let toolIteration = 0;
    const MAX_TOOLS = 10;
    let msgs = this.toGatewayMsgs();
    let continueLoop = true;

    while (continueLoop && toolIteration < MAX_TOOLS) {
      continueLoop = false;

      for await (const chunk of llmRouter.streamChat(this.model, msgs as RouterMessage[], systemPrompt)) {
        if (chunk.type === 'text' && chunk.content) {
          fullResponse += chunk.content;
          yield chunk.content;
        }

        if (chunk.type === 'tool_call' && chunk.toolCall) {
          if (++toolIteration > MAX_TOOLS) { yield '\n⚠️ Max tool iterations reached.\n'; break; }

          const tc = chunk.toolCall;
          yield `\n🔧 **Executing:** \`${tc.function.name}\`\n`;

          const args = JSON.parse(tc.function.arguments);
          const result = await this.executeTool(tc.function.name, args);

          this.messages.push({ role: 'assistant', content: null, tool_calls: [tc] });
          this.messages.push({ role: 'tool', tool_call_id: tc.id, content: result.error || result.content });

          yield result.error ? `\n⚠️ ${result.error}\n` : '\n✅ Done\n';
          msgs = this.toGatewayMsgs();
          continueLoop = true;
          break;
        }
      }
    }

    if (fullResponse) this.messages.push({ role: 'assistant', content: fullResponse });
    this._status = 'done';
    this._onStatusChange.fire('done');
    yield '[DONE]';
  }

  private toGatewayMsgs(): Array<{ role: string; content: string | null; tool_call_id?: string; tool_calls?: any[] }> {
    return this.messages.map((m) => ({
      role: m.role, content: m.content,
      ...(m.tool_calls ? { tool_calls: m.tool_calls.map((tc) => ({
        id: tc.id, type: tc.type,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })) } : {}),
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    }));
  }

  // LLM routing is embedded — calls OpenAI/Anthropic/Google/Ollama directly from the IDE

  private async executeTool(name: string, args: Record<string, unknown>): Promise<{ content?: string; error?: string }> {
    const { readFileSync, writeFileSync, mkdirSync, readdirSync } = require('fs');
    const { join, dirname, isAbsolute } = require('path');
    const { exec } = require('child_process');
    const resolvePath = (p: string) => isAbsolute(p) ? p : join(process.cwd(), p);

    try {
      switch (name) {
        case 'read_file': return { content: readFileSync(resolvePath(args.path as string), 'utf-8') };
        case 'write_file': {
          const fp = resolvePath(args.path as string);
          mkdirSync(dirname(fp), { recursive: true });
          writeFileSync(fp, args.content as string, 'utf-8');
          return { content: 'Written: ' + fp };
        }
        case 'edit_file': {
          const fp = resolvePath(args.path as string);
          const orig = readFileSync(fp, 'utf-8');
          const count = orig.split(args.old_string as string).length - 1;
          if (count === 0) return { error: 'old_string not found' };
          if (count > 1) return { error: `Found ${count} matches — must be unique` };
          writeFileSync(fp, orig.replace(args.old_string as string, args.new_string as string), 'utf-8');
          return { content: 'Edited: ' + fp };
        }
        case 'list_directory': {
          const dp = args.path ? resolvePath(args.path as string) : process.cwd();
          const entries = readdirSync(dp, { withFileTypes: true });
          return { content: entries.map((e: any) => e.isDirectory() ? e.name + '/' : e.name).join('\n') };
        }
        case 'execute_command':
          return new Promise((resolve) => {
            exec(args.command as string, { cwd: args.cwd as string, timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
              (_e: any, stdout: string, stderr: string) => resolve({ content: stdout || stderr || '(empty)', error: _e?.message }));
          });
        case 'search_codebase':
          return new Promise((resolve) => {
            const dir = args.path ? resolvePath(args.path as string) : process.cwd();
            const cmd = process.platform === 'win32'
              ? `findstr /s /i /n "${args.pattern}" "${dir}\\*" 2>nul`
              : `grep -rn "${args.pattern}" "${dir}" 2>/dev/null`;
            exec(cmd, { timeout: 15000, maxBuffer: 5 * 1024 * 1024, shell: true },
              (_e: any, stdout: string) => resolve({ content: stdout || 'No matches' }));
          });
        case 'browser_action': {
          try {
            const { BrowserAgent } = await import('../open-antigravity/browser/BrowserAgent.js');
            return { content: await new BrowserAgent().execute(args as any) };
          } catch (e: any) { return { error: 'Browser unavailable: ' + e.message }; }
        }
        default: return { error: 'Unknown tool: ' + name };
      }
    } catch (e: any) { return { error: e.message }; }
  }
}
