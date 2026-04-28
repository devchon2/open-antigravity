/*---------------------------------------------------------------------------------------------
 *  Open-Workflow Loader — Saved Prompts (/commands)
 *  Scans .open-antigravity/workflows/ in workspace + ~/.open-antigravity/workflows/ globally.
 *  Workflows are .md files triggered by /name in the agent chat.
 *--------------------------------------------------------------------------------------------*/

export interface Workflow {
  name: string; description: string; prompt: string; scope: 'global' | 'workspace';
}

export class WorkflowLoader {
  private workflows: Workflow[] = [];

  async scan(): Promise<void> {
    this.workflows = [];
    try {
      const { homedir } = require('os');
      const ws = process.cwd();
      await this.scanDir(ws + '/.open-antigravity/workflows', 'workspace');
      await this.scanDir(homedir() + '/.open-antigravity/workflows', 'global');
    } catch {}
  }

  getAll(): Workflow[] { return [...this.workflows]; }

  match(name: string): Workflow | undefined {
    const clean = name.replace(/^\//, '').toLowerCase();
    return this.workflows.find((w) => w.name.toLowerCase() === clean);
  }

  getSuggestions(prefix: string): Workflow[] {
    const clean = prefix.replace(/^\//, '').toLowerCase();
    if (!clean) return this.workflows;
    return this.workflows.filter((w) => w.name.toLowerCase().includes(clean));
  }

  private async scanDir(dir: string, scope: 'global' | 'workspace'): Promise<void> {
    try {
      const { existsSync, readdirSync, readFileSync } = require('fs');
      const { join } = require('path');
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir)) {
        if (!entry.endsWith('.md')) continue;
        const content = readFileSync(join(dir, entry), 'utf-8');
        const name = entry.replace('.md', '');
        let description = '';
        let promptStart = 0;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('# ')) {
            description = lines[i].trim().replace(/^#\s*/, '');
            promptStart = i + 1;
            break;
          }
        }
        this.workflows.push({
          name,
          description: description || name,
          prompt: lines.slice(promptStart).join('\n').trim() || content,
          scope,
        });
      }
    } catch {}
  }
}
