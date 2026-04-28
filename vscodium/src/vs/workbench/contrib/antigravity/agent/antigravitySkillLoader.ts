export interface Skill {
  name: string;
  description: string;
  instructions: string;
  scope: 'global' | 'workspace';
  path: string;
}

export class AntigravitySkillLoader {
  private skills: Skill[] = [];
  private loaded: Set<string> = new Set();

  async scan(): Promise<void> {
    this.skills = [];
    try {
      const { homedir } = require('os');
      const ws = process.cwd();
      await this.scanDir(ws + '/.antigravity/skills', 'workspace');
      await this.scanDir(homedir() + '/.antigravity/skills', 'global');
    } catch {}
  }

  getMetadata() {
    return this.skills.map((s) => ({ name: s.name, description: s.description, scope: s.scope }));
  }

  findMatching(userRequest: string): Skill[] {
    const l = userRequest.toLowerCase();
    return this.skills.filter((s) => {
      const kw = [...s.name.split('-'), ...s.description.split(' ')];
      return kw.some((k) => k.length > 2 && l.includes(k));
    });
  }

  load(name: string): Skill | undefined {
    const s = this.skills.find((x) => x.name === name);
    if (s) this.loaded.add(s.name);
    return s;
  }

  getLoadedInstructions(): string {
    return this.skills
      .filter((s) => this.loaded.has(s.name))
      .map((s) => '### Skill: ' + s.name + '\n' + s.instructions)
      .join('\n\n');
  }

  matchCommand(cmd: string): Skill | undefined {
    return this.skills.find(
      (s) => s.name.toLowerCase() === cmd.replace(/^\//, '').toLowerCase(),
    );
  }

  reset(): void { this.loaded.clear(); }

  private async scanDir(dir: string, scope: 'global' | 'workspace'): Promise<void> {
    try {
      const { existsSync, readdirSync, readFileSync } = require('fs');
      const { join } = require('path');
      if (!existsSync(dir)) return;
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const sf = join(dir, e.name, 'SKILL.md');
        if (existsSync(sf)) {
          const c = readFileSync(sf, 'utf-8');
          const { n, d, i } = this.parseMd(c);
          if (n) this.skills.push({ name: n, description: d || '', instructions: i || c, scope, path: join(dir, e.name) });
        }
      }
    } catch {}
  }

  private parseMd(c: string): { n?: string; d?: string; i?: string } {
    const l = c.split('\n');
    let n: string | undefined, d: string | undefined, is = 0, fm = false;
    for (let i = 0; i < l.length; i++) {
      const li = l[i].trim();
      if (li === '---') {
        if (!fm) { fm = true; continue; } else { is = i + 1; break; }
      }
      if (fm) {
        const m = li.match(/^(\w+):\s*(.+)/);
        if (m) {
          if (m[1] === 'name') n = m[2].trim();
          if (m[1] === 'description') d = m[2].trim();
        }
      }
    }
    return { n, d, i: l.slice(is).join('\n').trim() || undefined };
  }
}
