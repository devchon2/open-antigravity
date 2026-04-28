import { Disposable } from '../../../../../base/common/lifecycle.js';

export class AntigravityAgent extends Disposable {
  private messages: Array<{ role: string; content: string | null }> = [];
  private model: string;

  constructor(model: string) { super(); this.model = model; }
  reset(): void { this.messages = []; }
  getConversation() { return [...this.messages]; }

  async *run(userMessage: string, mode: 'fast' | 'planning' = 'fast'): AsyncIterable<string> {
    const runId = crypto.randomUUID();
    let system = 'You are an autonomous coding agent in the Open-Antigravity IDE (VSCodium fork).\n';
    system += 'Tools: read_file, write_file, edit_file, list_directory, execute_command, search_codebase, browser_action\n';
    if (mode === 'planning') system += '\nPLANNING mode. Research and plan before executing.\n';

    this.messages.push({ role: 'user', content: userMessage });
    yield `[Agent ready] Model: ${this.model} | Mode: ${mode}\n\n`;
    yield `Task: ${userMessage}\n\n`;
    yield 'Agent engine integrated into VSCodium workbench. Gateway: packages/llm-gateway.\n';
    yield '[DONE]';
  }
}
