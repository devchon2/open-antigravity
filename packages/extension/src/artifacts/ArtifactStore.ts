import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export type ArtifactType = 'task_list' | 'plan' | 'diff' | 'screenshot' | 'browser_recording' | 'walkthrough' | 'test_result';
export type ArtifactStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'approved' | 'rejected';

export interface ArtifactComment {
  id: string;
  author: 'user' | 'agent';
  content: string;
  timestamp: string;
}

export interface Artifact {
  id: string;
  agentId: string;
  type: ArtifactType;
  title: string;
  content: string;
  status: ArtifactStatus;
  comments: ArtifactComment[];
  parentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class ArtifactStore {
  private artifacts: Map<string, Artifact> = new Map();
  private storagePath: string;

  constructor() {
    const ws = vscode.workspace.workspaceFolders?.[0];
    this.storagePath = ws ? path.join(ws.uri.fsPath, '.antigravity', 'artifacts.json') : '';
  }

  /** Create a new artifact */
  create(
    agentId: string,
    type: ArtifactType,
    title: string,
    content: string,
    status: ArtifactStatus = 'pending',
    parentId?: string,
    metadata?: Record<string, unknown>,
  ): Artifact {
    const now = new Date().toISOString();
    const artifact: Artifact = {
      id: crypto.randomUUID(),
      agentId,
      type,
      title,
      content,
      status,
      comments: [],
      parentId,
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  /** Get artifact by ID */
  get(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  /** Get all artifacts for an agent */
  getByAgent(agentId: string): Artifact[] {
    return Array.from(this.artifacts.values())
      .filter((a) => a.agentId === agentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /** Get artifacts by type */
  getByType(type: ArtifactType): Artifact[] {
    return Array.from(this.artifacts.values())
      .filter((a) => a.type === type)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /** Get all artifacts */
  getAll(): Artifact[] {
    return Array.from(this.artifacts.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /** Update artifact status */
  updateStatus(id: string, status: ArtifactStatus): Artifact | undefined {
    const artifact = this.artifacts.get(id);
    if (!artifact) return undefined;
    artifact.status = status;
    artifact.updatedAt = new Date().toISOString();
    return artifact;
  }

  /** Update artifact content */
  updateContent(id: string, content: string): Artifact | undefined {
    const artifact = this.artifacts.get(id);
    if (!artifact) return undefined;
    artifact.content = content;
    artifact.updatedAt = new Date().toISOString();
    return artifact;
  }

  /** Add a comment to an artifact */
  addComment(artifactId: string, author: 'user' | 'agent', content: string): ArtifactComment | undefined {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) return undefined;
    const comment: ArtifactComment = {
      id: crypto.randomUUID(),
      author,
      content,
      timestamp: new Date().toISOString(),
    };
    artifact.comments.push(comment);
    artifact.updatedAt = new Date().toISOString();
    return comment;
  }

  /** Delete an artifact */
  delete(id: string): boolean {
    return this.artifacts.delete(id);
  }

  /** Persist artifacts to disk */
  async save(): Promise<void> {
    if (!this.storagePath) return;
    try {
      const dir = path.dirname(this.storagePath);
      fs.mkdirSync(dir, { recursive: true });
      const data = JSON.stringify(Array.from(this.artifacts.values()), null, 2);
      fs.writeFileSync(this.storagePath, data, 'utf-8');
    } catch {
      // Silently fail — persistence is best-effort
    }
  }

  /** Load artifacts from disk */
  async load(): Promise<void> {
    if (!this.storagePath) return;
    try {
      if (!fs.existsSync(this.storagePath)) return;
      const data = fs.readFileSync(this.storagePath, 'utf-8');
      const parsed: Artifact[] = JSON.parse(data);
      this.artifacts.clear();
      for (const a of parsed) {
        this.artifacts.set(a.id, a);
      }
    } catch {
      // Silently fail
    }
  }

  /** Get task tree (task_list + subtasks) */
  getTaskTree(agentId: string): Artifact[] {
    const all = this.getByAgent(agentId);
    const tasks = all.filter((a) => a.type === 'task_list');
    return tasks.map((task) => ({
      ...task,
      children: all.filter((a) => a.parentId === task.id),
    })) as any;
  }
}

export const artifactStore = new ArtifactStore();
