/*---------------------------------------------------------------------------------------------
 *  Open-Skill Loader — Progressive Disclosure
 *  Scans .open-antigravity/skills/ in workspace + ~/.open-antigravity/skills/ globally.
 *  Skills are only loaded into context when the user request matches the skill description.
 *--------------------------------------------------------------------------------------------*/

export interface Skill {
  name: string; description: string; instructions: string;
  scope: 'global' | 'workspace'; path: string;
}

export class SkillLoader {
  private skills: Skill[] = [];
  private loaded: Set<string> = new Set();

  async scan(): Promise<void> {
    this.skills = [];
    try {
      const { homedir } = require('os');
      const ws = process.cwd();
      await this.scanDir(ws + '/.open-antigravity/skills', 'workspace');
      await this.scanDir(homedir() + '/.open-antigravity/skills', 'global');
    } catch { /* silently skip if dirs don't exist */ }
  }

  getMetadata(): Array<{ name: string; description: string; scope: string }> {
    return this.skills.map((s) => ({ name: s.name, description: s.description, scope: s.scope }));
  }

  findMatching(userRequest: string): Skill[] {
    const lower = userRequest.toLowerCase();
    return this.skills.filter((s) => {
      const keywords = [...s.name.split('-'), ...s.description.split(' ')];
      return keywords.some((k) => k.length > 2 && lower.includes(k.toLowerCase()));
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
      .map((s) => `### Skill: ${s.name}\n${s.instructions}`)
      .join('\n\n');
  }

  matchCommand(cmd: string): Skill | undefined {
    const clean = cmd.replace(/^\//, '').toLowerCase();
    return this.skills.find((s) => s.name.toLowerCase() === clean);
  }

  reset(): void { this.loaded.clear(); }

  private async scanDir(dir: string, scope: 'global' | 'workspace'): Promise<void> {
    try {
      const { existsSync, readdirSync, readFileSync } = require('fs');
      const { join } = require('path');
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillMd = join(dir, entry.name, 'SKILL.md');
        if (existsSync(skillMd)) {
          const content = readFileSync(skillMd, 'utf-8');
          const parsed = this.parseFrontmatter(content);
          this.skills.push({
            name: parsed.name || entry.name,
            description: parsed.description || '',
            instructions: parsed.instructions || content,
            scope,
            path: join(dir, entry.name),
          });
        }
      }
    } catch { /* silently skip unreadable dirs */ }
  }

  private parseFrontmatter(content: string): { name?: string; description?: string; instructions?: string } {
    const lines = content.split('\n');
    let name: string | undefined;
    let description: string | undefined;
    let inFM = false;
    let bodyStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '---') {
        if (!inFM) { inFM = true; continue; }
        else { bodyStart = i + 1; break; }
      }
      if (inFM) {
        const m = line.match(/^(\w+):\s*(.+)/);
        if (m) {
          if (m[1] === 'name') name = m[2].trim();
          if (m[1] === 'description') description = m[2].trim();
        }
      }
    }

    return { name, description, instructions: lines.slice(bodyStart).join('\n').trim() || undefined };
  }
}
