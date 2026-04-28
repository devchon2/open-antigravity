export interface Workflow {
  name: string;
  description: string;
  prompt: string;
  scope: 'global' | 'workspace';
}

export class AntigravityWorkflowLoader {
  private wf: Workflow[] = [];

  async scan(): Promise<void> {
    this.wf = [];
    try {
      const { homedir } = require('os');
      const ws = process.cwd();
      await this.scanDir(ws + '/.antigravity/workflows', 'workspace');
      await this.scanDir(homedir() + '/.antigravity/workflows', 'global');
    } catch {}
  }

  getAll(): Workflow[] { return [...this.wf]; }

  match(name: string): Workflow | undefined {
    return this.wf.find((w) => w.name.toLowerCase() === name.replace(/^\//, '').toLowerCase());
  }

  getSuggestions(pref: string): Workflow[] {
    const p = pref.replace(/^\//, '').toLowerCase();
    if (!p) return this.wf;
    return this.wf.filter((w) => w.name.toLowerCase().includes(p));
  }

  private async scanDir(dir: string, scope: 'global' | 'workspace'): Promise<void> {
    try {
      const { existsSync, readdirSync, readFileSync } = require('fs');
      const { join } = require('path');
      if (!existsSync(dir)) return;
      for (const e of readdirSync(dir)) {
        if (!e.endsWith('.md')) continue;
        const c = readFileSync(join(dir, e), 'utf-8');
        const n = e.replace('.md', '');
        let d = '', ps = 0;
        const l = c.split('\n');
        for (let i = 0; i < l.length; i++) {
          if (l[i].trim().startsWith('# ')) { d = l[i].trim().replace(/^#\s*/, ''); ps = i + 1; break; }
        }
        this.wf.push({ name: n, description: d || n, prompt: l.slice(ps).join('\n').trim() || c, scope });
      }
    } catch {}
  }
}
