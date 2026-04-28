import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface FileChange {
  filePath: string;
  originalContent: string;
  newContent: string;
  diff: string;
}

export class DiffManager {
  private changes: Map<string, FileChange> = new Map();

  /** Generate unified diff using Myers-like LCS algorithm */
  generateDiff(filePath: string, original: string, modified: string): string {
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const lcs = this.computeLCS(origLines, modLines);

    const result: string[] = [];
    result.push(`--- a/${filePath}`);
    result.push(`+++ b/${filePath}`);

    let oi = 0, mi = 0, li = 0;
    const hunks: Array<{ oStart: number; oCount: number; mStart: number; mCount: number; lines: string[] }> = [];
    let currentHunk: typeof hunks[0] | null = null;

    while (oi < origLines.length || mi < modLines.length) {
      if (li < lcs.length && oi < origLines.length && mi < modLines.length &&
          origLines[oi] === lcs[li] && modLines[mi] === lcs[li]) {
        // Common line
        if (currentHunk && currentHunk.lines.length > 0) {
          hunks.push(currentHunk);
          currentHunk = null;
        }
        oi++; mi++; li++;
      } else {
        if (!currentHunk) {
          const contextStart = Math.max(0, oi - 3);
          currentHunk = { oStart: contextStart, oCount: 0, mStart: Math.max(0, mi - 3), mCount: 0, lines: [] };
        }
        if (oi < origLines.length && (li >= lcs.length || origLines[oi] !== lcs[li])) {
          currentHunk.lines.push(`-${origLines[oi]}`);
          oi++;
        }
        if (mi < modLines.length && (li >= lcs.length || modLines[mi] !== lcs[li])) {
          currentHunk.lines.push(`+${modLines[mi]}`);
          mi++;
        }
      }
    }
    if (currentHunk && currentHunk.lines.length > 0) hunks.push(currentHunk);

    for (const hunk of hunks) {
      if (hunk.lines.length === 0) continue;
      const oLen = hunk.lines.filter(l => l.startsWith('-') || l.startsWith(' ')).length || 1;
      const mLen = hunk.lines.filter(l => l.startsWith('+') || l.startsWith(' ')).length || 1;
      result.push(`@@ -${hunk.oStart + 1},${oLen} +${hunk.mStart + 1},${mLen} @@`);
      result.push(...hunk.lines);
    }

    return result.join('\n');
  }

  /** Open a VS Code diff editor to show proposed changes */
  async showDiff(filePath: string, change: FileChange): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
    const originalUri = vscode.Uri.parse(`untitled:${path.basename(filePath)}.original`);
    const modifiedUri = vscode.Uri.file(fullPath);

    const origDoc = await vscode.workspace.openTextDocument({ content: change.originalContent });

    await vscode.commands.executeCommand('vscode.diff',
      origDoc.uri, modifiedUri, `Proposed: ${path.basename(filePath)}`);
    this.changes.set(filePath, change);
  }

  async applyChange(filePath: string): Promise<void> {
    const change = this.changes.get(filePath);
    if (!change) throw new Error(`No change for ${filePath}`);
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, change.newContent, 'utf-8');
    this.changes.delete(filePath);
  }

  getChange(filePath: string): FileChange | undefined { return this.changes.get(filePath); }
  clear(): void { this.changes.clear(); }

  /** Compute Longest Common Subsequence for diff generation */
  private computeLCS(a: string[], b: string[]): string[] {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) { lcs.unshift(a[i - 1]); i--; j--; }
      else if (dp[i - 1][j] > dp[i][j - 1]) i--;
      else j--;
    }
    return lcs;
  }
}

export const diffManager = new DiffManager();
