import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Skill {
  name: string;
  description: string;
  instructions: string;
  scope: 'global' | 'workspace';
  path: string;
}

export class SkillLoader {
  private skills: Skill[] = [];
  private loaded: Set<string> = new Set();

  /** Scan for skills in global and workspace directories */
  async scan(): Promise<void> {
    this.skills = [];

    // Workspace skills
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (ws) {
      const wsSkillsPath = path.join(ws.uri.fsPath, '.agent', 'skills');
      await this.scanDirectory(wsSkillsPath, 'workspace');
    }

    // Global skills
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (home) {
      const globalSkillsPath = path.join(home, '.agent', 'skills');
      await this.scanDirectory(globalSkillsPath, 'global');
    }
  }

  /** Get skill metadata (name + description) for progressive disclosure */
  getSkillMetadata(): Array<{ name: string; description: string; scope: string }> {
    return this.skills.map((s) => ({
      name: s.name,
      description: s.description,
      scope: s.scope,
    }));
  }

  /** Find skills matching a user request */
  findMatchingSkills(userRequest: string): Skill[] {
    const lower = userRequest.toLowerCase();
    return this.skills.filter((s) => {
      const desc = s.description.toLowerCase();
      const name = s.name.toLowerCase();
      // Simple keyword matching
      const keywords = [...name.split('-'), ...desc.split(' ')];
      return keywords.some((kw) => kw.length > 2 && lower.includes(kw));
    });
  }

  /** Load full instructions for a skill (progressive disclosure) */
  loadSkill(name: string): Skill | undefined {
    const skill = this.skills.find((s) => s.name === name);
    if (!skill) return undefined;
    this.loaded.add(skill.name);
    return skill;
  }

  /** Get loaded skills for context injection */
  getLoadedInstructions(): string {
    return this.skills
      .filter((s) => this.loaded.has(s.name))
      .map((s) => `### Skill: ${s.name}\n${s.instructions}`)
      .join('\n\n');
  }

  /** Check if a /command matches a skill */
  matchCommand(command: string): Skill | undefined {
    const clean = command.replace(/^\//, '').toLowerCase();
    return this.skills.find(
      (s) =>
        s.name.toLowerCase() === clean ||
        s.name.toLowerCase().includes(clean) ||
        clean.includes(s.name.toLowerCase()),
    );
  }

  /** Clear loaded skills */
  reset(): void {
    this.loaded.clear();
  }

  private async scanDirectory(dir: string, scope: 'global' | 'workspace'): Promise<void> {
    try {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillDir = path.join(dir, entry.name);
        const skillMd = path.join(skillDir, 'SKILL.md');

        if (fs.existsSync(skillMd)) {
          const content = fs.readFileSync(skillMd, 'utf-8');
          const { name, description, instructions } = this.parseSkillMd(content);
          if (name) {
            this.skills.push({
              name: name || entry.name,
              description: description || '',
              instructions: instructions || content,
              scope,
              path: skillDir,
            });
          }
        }
      }
    } catch {
      // Silently skip unreadable directories
    }
  }

  private parseSkillMd(content: string): { name?: string; description?: string; instructions?: string } {
    const lines = content.split('\n');
    let name: string | undefined;
    let description: string | undefined;
    let inFrontmatter = false;
    let instructionsStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          continue;
        } else {
          instructionsStart = i + 1;
          break;
        }
      }
      if (inFrontmatter) {
        const match = line.match(/^(\w+):\s*(.+)/);
        if (match) {
          if (match[1] === 'name') name = match[2].trim();
          if (match[1] === 'description') description = match[2].trim();
        }
      }
    }

    const instructions = lines.slice(instructionsStart).join('\n').trim();
    return { name, description, instructions: instructions || undefined };
  }
}

export const skillLoader = new SkillLoader();
