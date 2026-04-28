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

  /** Generate a unified diff between original and new content */
  generateDiff(filePath: string, original: string, modified: string): string {
    const lines: string[] = [];
    const heading = `--- a/${filePath}\n+++ b/${filePath}`;
    lines.push(heading);

    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const maxLen = Math.max(origLines.length, modLines.length);
    let i = 0, j = 0;

    while (i < maxLen || j < maxLen) {
      const oLine = i < origLines.length ? origLines[i] : undefined;
      const mLine = j < modLines.length ? modLines[j] : undefined;

      if (oLine === mLine) {
        if (oLine !== undefined) lines.push(` ${oLine}`);
        i++; j++;
      } else {
        if (oLine !== undefined) { lines.push(`-${oLine}`); i++; }
        if (mLine !== undefined) { lines.push(`+${mLine}`); j++; }
      }
    }
    return lines.join('\n');
  }

  /** Show a diff in the VS Code diff editor */
  async showDiff(filePath: string, change: FileChange): Promise<boolean> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
    
    const originalUri = vscode.Uri.parse(`untitled:${path.basename(filePath)}.original`);
    const modifiedUri = vscode.Uri.file(fullPath);

    // Write original content to a temp document
    const origDoc = await vscode.workspace.openTextDocument({ content: change.originalContent });
    await origDoc.save();

    // Show diff
    await vscode.commands.executeCommand('vscode.diff',
      vscode.Uri.file(origDoc.fileName),
      modifiedUri,
      `Proposed: ${path.basename(filePath)} (Accept/Reject in Chat)`
    );

    // Store the change
    this.changes.set(filePath, change);
    return true;
  }

  /** Apply a stored change to the file */
  async applyChange(filePath: string): Promise<void> {
    const change = this.changes.get(filePath);
    if (!change) throw new Error(`No change stored for ${filePath}`);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, change.newContent, 'utf-8');
    this.changes.delete(filePath);
  }

  /** Revert a change (restore original content) */
  async revertChange(filePath: string): Promise<void> {
    const change = this.changes.get(filePath);
    if (!change) throw new Error(`No change stored for ${filePath}`);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);

    fs.writeFileSync(fullPath, change.originalContent, 'utf-8');
    this.changes.delete(filePath);
  }

  /** Get a stored change */
  getChange(filePath: string): FileChange | undefined {
    return this.changes.get(filePath);
  }

  /** Clear all stored changes */
  clear(): void {
    this.changes.clear();
  }
}

export const diffManager = new DiffManager();
