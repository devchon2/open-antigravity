import * as vscode from 'vscode';
import * as cp from 'child_process';

export interface Checkpoint {
  id: string;
  timestamp: string;
  description: string;
}

export class CheckpointManager {
  private checkpoints: Checkpoint[] = [];
  private workspacePath: string;

  constructor() {
    this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  async create(description: string): Promise<Checkpoint | null> {
    if (!this.workspacePath) return null;
    try {
      // Actually stash changes (unlike git stash create which doesn't modify working tree)
      const result = await this.exec('git', ['stash', 'push', '-m', description], this.workspacePath);
      if (result.includes('No local changes to save')) return null;

      // Get the stash reference
      const ref = await this.exec('git', ['stash', 'list', '-1', '--format=%H'], this.workspacePath);
      if (!ref.trim()) return null;

      const checkpoint: Checkpoint = {
        id: ref.trim(),
        timestamp: new Date().toISOString(),
        description,
      };
      this.checkpoints.push(checkpoint);
      return checkpoint;
    } catch {
      return null;
    }
  }

  async restore(checkpoint: Checkpoint): Promise<boolean> {
    if (!this.workspacePath) return false;
    try {
      // Find the stash index by hash
      const list = await this.exec('git', ['stash', 'list'], this.workspacePath);
      const lines = list.split('\n');
      let stashRef = '';
      for (const line of lines) {
        if (line.includes(checkpoint.description)) {
          const match = line.match(/^(stash@\{\d+\})/);
          if (match) { stashRef = match[1]; break; }
        }
      }
      if (!stashRef) return false;

      await this.exec('git', ['stash', 'apply', stashRef, '--index'], this.workspacePath);
      this.checkpoints = this.checkpoints.slice(0, this.checkpoints.indexOf(checkpoint) + 1);
      return true;
    } catch {
      return false;
    }
  }

  async undoLast(): Promise<boolean> {
    const last = this.checkpoints.pop();
    if (!last) return false;
    // Drop the last stash
    try {
      await this.exec('git', ['stash', 'drop', 'stash@{0}'], this.workspacePath);
    } catch { /* ok if fails */ }
    return true; // working tree is already restored since we pop
  }

  getLast(): Checkpoint | undefined {
    return this.checkpoints[this.checkpoints.length - 1];
  }

  clear(): void { this.checkpoints = []; }
  get size(): number { return this.checkpoints.length; }

  private exec(cmd: string, args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cp.execFile(cmd, args, { cwd }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve(stdout.trim());
      });
    });
  }
}

export const checkpointManager = new CheckpointManager();
