/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Security Policy Presets
 *  Four predefined security configurations matching Antigravity's presets:
 *  1. Secure Mode         — enhanced restrictions
 *  2. Review-Driven Dev   — frequent user review (recommended)
 *  3. Agent-Driven Dev    — never asks for review
 *  4. Custom              — full manual control
 *--------------------------------------------------------------------------------------------*/

export type TerminalPolicy = 'off' | 'auto' | 'turbo';
export type ReviewPolicy = 'always_proceed' | 'agent_decides' | 'request_review';
export type JSPolicy = 'always_proceed' | 'request_review' | 'disabled';

export interface SecurityConfig {
  terminal: TerminalPolicy;
  review: ReviewPolicy;
  jsExecution: JSPolicy;
  allowList: string[];
  denyList: string[];
  browserAllowList: string[];
}

export const PRESETS: Record<string, SecurityConfig> = {
  secure: {
    terminal: 'off',
    review: 'request_review',
    jsExecution: 'disabled',
    allowList: ['ls', 'dir', 'cat', 'echo', 'git status', 'git diff', 'git log', 'npm test', 'npm run build'],
    denyList: ['rm', 'rmdir', 'sudo', 'curl', 'wget', 'ssh', 'shutdown', 'reboot', 'format', 'del'],
    browserAllowList: ['localhost', '127.0.0.1'],
  },

  'review-driven': {
    terminal: 'auto',
    review: 'request_review',
    jsExecution: 'request_review',
    allowList: ['npm test', 'npm run', 'git status', 'git diff', 'git log', 'git add', 'git commit', 'ls', 'dir', 'cat', 'echo', 'node --version', 'python --version'],
    denyList: ['rm -rf /', 'sudo rm', 'git push --force', 'shutdown', 'reboot', 'DROP ', 'DELETE '],
    browserAllowList: ['localhost', '127.0.0.1', 'github.com'],
  },

  'agent-driven': {
    terminal: 'turbo',
    review: 'always_proceed',
    jsExecution: 'always_proceed',
    allowList: [],
    denyList: ['rm -rf /', 'sudo rm -rf /', 'shutdown', 'reboot', 'format C:', 'DROP DATABASE'],
    browserAllowList: [],
  },

  custom: {
    terminal: 'auto',
    review: 'agent_decides',
    jsExecution: 'request_review',
    allowList: [],
    denyList: ['sudo rm -rf /', 'shutdown', 'reboot'],
    browserAllowList: [],
  },
};

export class PolicyManager {
  private config: SecurityConfig = { ...PRESETS['review-driven'] };

  /** Set policy from a preset name */
  setPreset(name: string): boolean {
    const preset = PRESETS[name];
    if (!preset) return false;
    this.config = { ...preset };
    return true;
  }

  /** Get current config */
  getConfig(): Readonly<SecurityConfig> {
    return this.config;
  }

  /** Check if a terminal command is allowed */
  isCommandAllowed(command: string): boolean {
    // Check deny list first (always blocked)
    if (this.config.denyList.some((d) => command.includes(d))) return false;

    // Off mode: everything blocked unless in allow list
    if (this.config.terminal === 'off') {
      return this.config.allowList.some((a) => {
        if (a.endsWith('*')) return command.startsWith(a.slice(0, -1));
        return command === a;
      });
    }

    // Auto/Turbo: allowed unless in deny list
    return true;
  }

  /** Check if a command requires user approval */
  requiresApproval(command: string): boolean {
    if (this.config.terminal === 'turbo') return false;
    if (this.config.terminal === 'off') return true;
    // Auto mode: agent decides (heuristic: commands longer than 30 chars or with flags)
    return command.length > 30 || command.includes('|') || command.includes('>');
  }

  /** Check if a browser URL is in the allowlist */
  isUrlAllowed(url: string): boolean {
    if (this.config.browserAllowList.length === 0) return true;
    return this.config.browserAllowList.some((a) => url.includes(a));
  }

  /** Should JS execution be allowed? */
  canExecuteJS(): boolean {
    return this.config.jsExecution !== 'disabled';
  }

  /** Should JS execution require approval? */
  jsRequiresApproval(): boolean {
    return this.config.jsExecution === 'request_review';
  }

  /** Should artifact review happen? */
  shouldReview(): boolean {
    return this.config.review !== 'always_proceed';
  }
}

export const policyManager = new PolicyManager();
