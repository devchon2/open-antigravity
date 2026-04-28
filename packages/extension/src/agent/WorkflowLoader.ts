import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Workflow {
  name: string;
  description: string;
  prompt: string;
  scope: 'global' | 'workspace';
}

export class WorkflowLoader {
  private workflows: Workflow[] = [];

  async scan(): Promise<void> {
    this.workflows = [];

    const ws = vscode.workspace.workspaceFolders?.[0];
    if (ws) {
      await this.scanDir(path.join(ws.uri.fsPath, '.agent', 'workflows'), 'workspace');
    }

    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (home) {
      await this.scanDir(path.join(home, '.gemini', 'antigravity', 'global_workflows'), 'global');
    }
  }

  getAll(): Workflow[] {
    return [...this.workflows];
  }

  matchCommand(command: string): Workflow | undefined {
    const clean = command.replace(/^\//, '').toLowerCase();
    return this.workflows.find((w) => w.name.toLowerCase() === clean);
  }

  getSuggestions(prefix: string): Workflow[] {
    const clean = prefix.replace(/^\//, '').toLowerCase();
    if (!clean) return this.workflows;
    return this.workflows.filter((w) => w.name.toLowerCase().includes(clean));
  }

  private async scanDir(dir: string, scope: 'global' | 'workspace'): Promise<void> {
    try {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        if (!entry.endsWith('.md')) continue;
        const filePath = path.join(dir, entry);
        const content = fs.readFileSync(filePath, 'utf-8');
        const name = entry.replace('.md', '');

        const lines = content.split('\n');
        let description = '';
        let promptStart = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('# ')) {
            description = line.replace(/^#\s*/, '');
            promptStart = i + 1;
            break;
          }
        }

        const prompt = lines.slice(promptStart).join('\n').trim() || content;

        this.workflows.push({ name, description: description || name, prompt, scope });
      }
    } catch {
      // skip
    }
  }
}

export const workflowLoader = new WorkflowLoader();
