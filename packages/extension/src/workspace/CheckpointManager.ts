import * as vscode from 'vscode';
import * as cp from 'child_process';

export interface Checkpoint {
  id: string;
  timestamp: string;
  description: string;
  stashRef: string;
}

export class CheckpointManager {
  private checkpoints: Checkpoint[] = [];
  private workspacePath: string;

  constructor() {
    this.workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  /** Create a git stash checkpoint before an agent step */
  async create(description: string): Promise<Checkpoint | null> {
    if (!this.workspacePath) return null;

    try {
      const stashRef = await this.exec('git', ['stash', 'create'], this.workspacePath);
      if (!stashRef.trim()) return null; // No changes to stash

      const checkpoint: Checkpoint = {
        id: stashRef.trim(),
        timestamp: new Date().toISOString(),
        description,
        stashRef: stashRef.trim(),
      };

      this.checkpoints.push(checkpoint);
      return checkpoint;
    } catch {
      return null; // Not a git repo or git not available
    }
  }

  /** Restore to a specific checkpoint (revert changes since then) */
  async restore(checkpoint: Checkpoint): Promise<boolean> {
    if (!this.workspacePath) return false;

    try {
      await this.exec('git', ['stash', 'apply', checkpoint.stashRef, '--index'], this.workspacePath);
      // Remove from history
      this.checkpoints = this.checkpoints.filter((c) =>
        this.checkpoints.indexOf(c) <= this.checkpoints.indexOf(checkpoint)
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Revert to the last checkpoint */
  async undoLast(): Promise<boolean> {
    const last = this.checkpoints.pop();
    if (!last) return false;
    return this.restore(last);
  }

  /** Get the most recent checkpoint */
  getLast(): Checkpoint | undefined {
    return this.checkpoints[this.checkpoints.length - 1];
  }

  /** Clear all checkpoints */
  clear(): void {
    this.checkpoints = [];
  }

  /** Number of stored checkpoints */
  get size(): number {
    return this.checkpoints.length;
  }

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
