import * as vscode from 'vscode';

export interface ApprovalRequest {
  id: string;
  type: 'file_write' | 'command_exec' | 'browser_action';
  title: string;
  description: string;
  details?: string;
  metadata?: Record<string, unknown>;
  resolve: (approved: boolean) => void;
}

export class ApprovalManager {
  private pending: ApprovalRequest[] = [];
  private autoApprove: boolean = false;
  private listeners: Set<(req: ApprovalRequest) => void> = new Set();

  /** Set auto-approve mode (e.g., when user sets approvalMode: 'never') */
  setAutoApprove(enabled: boolean): void {
    this.autoApprove = enabled;
  }

  /** Check if a command is in the allowlist */
  isCommandAllowed(command: string, allowList: string[]): boolean {
    if (allowList.length === 0) return false;
    return allowList.some((pattern) => {
      if (pattern.endsWith('*')) return command.startsWith(pattern.slice(0, -1));
      return command === pattern;
    });
  }

  /** Check if a command is in the denylist */
  isCommandDenied(command: string, denyList: string[]): boolean {
    return denyList.some((pattern) => {
      if (pattern.endsWith('*')) return command.startsWith(pattern.slice(0, -1));
      return command === pattern;
    });
  }

  /** Request approval for an action. Returns true if approved. */
  async requestApproval(
    type: ApprovalRequest['type'],
    title: string,
    description: string,
    details?: string,
    metadata?: Record<string, unknown>,
  ): Promise<boolean> {
    if (this.autoApprove) return true;

    return new Promise((resolve) => {
      const req: ApprovalRequest = {
        id: crypto.randomUUID(),
        type, title, description, details, metadata,
        resolve: (approved: boolean) => {
          this.pending = this.pending.filter((r) => r.id !== req.id);
          resolve(approved);
        },
      };
      this.pending.push(req);
      this.notifyListeners(req);
    });
  }

  /** Approve a pending request by ID */
  approve(id: string): void {
    const req = this.pending.find((r) => r.id === id);
    if (req) req.resolve(true);
  }

  /** Reject a pending request by ID */
  reject(id: string): void {
    const req = this.pending.find((r) => r.id === id);
    if (req) req.resolve(false);
  }

  /** Get all pending requests */
  getPending(): ApprovalRequest[] {
    return [...this.pending];
  }

  /** Subscribe to approval requests (for UI display) */
  onRequest(listener: (req: ApprovalRequest) => void): vscode.Disposable {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  private notifyListeners(req: ApprovalRequest): void {
    this.listeners.forEach((l) => l(req));
  }
}

export const approvalManager = new ApprovalManager();
