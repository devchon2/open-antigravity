/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Rules Loader
 *  Always-on system instructions. Like Antigravity's GEMINI.md + .agent/rules/.
 *  Global rule: ~/.open-antigravity/GEMINI.md
 *  Workspace rules: <workspace>/.open-antigravity/rules/
 *--------------------------------------------------------------------------------------------*/

import { IFileService } from '../../../../../platform/files/common/files.js';
import { URI } from '../../../../../base/common/uri.js';

export interface Rule {
  name: string;
  content: string;
  scope: 'global' | 'workspace';
  path: string;
}

export class RulesLoader {
  private rules: Rule[] = [];

  /** Scan for GEMINI.md (global) and .open-antigravity/rules/*.md (workspace) */
  async scan(workspaceRoot: string): Promise<void> {
    this.rules = [];
    const { existsSync, readFileSync, readdirSync } = require('fs');
    const { join } = require('path');
    const { homedir } = require('os');

    // Global rule: ~/.open-antigravity/GEMINI.md
    try {
      const globalPath = join(homedir(), '.open-antigravity', 'GEMINI.md');
      if (existsSync(globalPath)) {
        this.rules.push({
          name: 'GEMINI.md (global)',
          content: readFileSync(globalPath, 'utf-8'),
          scope: 'global',
          path: globalPath,
        });
      }
    } catch {}

    // Workspace rules: .open-antigravity/rules/*.md
    if (workspaceRoot) {
      try {
        const rulesDir = join(workspaceRoot, '.open-antigravity', 'rules');
        if (existsSync(rulesDir)) {
          for (const entry of readdirSync(rulesDir)) {
            if (!entry.endsWith('.md')) continue;
            const fp = join(rulesDir, entry);
            this.rules.push({
              name: entry.replace('.md', ''),
              content: readFileSync(fp, 'utf-8'),
              scope: 'workspace',
              path: fp,
            });
          }
        }
      } catch {}
    }
  }

  /** Get all loaded rules as a combined system prompt fragment */
  getCombinedPrompt(): string {
    if (this.rules.length === 0) return '';
    return this.rules
      .map((r) => `[Rule: ${r.name} (${r.scope})]\n${r.content}`)
      .join('\n\n---\n\n');
  }

  /** Get rules by scope */
  getByScope(scope: 'global' | 'workspace'): Rule[] {
    return this.rules.filter((r) => r.scope === scope);
  }

  /** Check if any rules are loaded */
  get hasRules(): boolean {
    return this.rules.length > 0;
  }

  /** Clear loaded rules */
  clear(): void {
    this.rules = [];
  }
}
