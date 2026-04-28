export type ArtifactType = 'task_list'|'plan'|'diff'|'screenshot'|'browser_recording'|'walkthrough'|'test_result';
export type ArtifactStatus = 'pending'|'in_progress'|'completed'|'failed'|'approved'|'rejected';
export interface ArtifactComment { id:string; author:'user'|'agent'; content:string; timestamp:string; }
export interface Artifact { id:string; agentId:string; type:ArtifactType; title:string; content:string; status:ArtifactStatus; comments:ArtifactComment[]; parentId?:string; createdAt:string; updatedAt:string; }

export interface IAntigravityArtifactStore {
  create(agentId:string,type:ArtifactType,title:string,content:string,status?:ArtifactStatus): Artifact;
  get(id:string): Artifact|undefined; getByAgent(agentId:string): Artifact[]; getByType(type:ArtifactType): Artifact[];
  addComment(artifactId:string,author:'user'|'agent',content:string): ArtifactComment|undefined;
  save(): Promise<void>; load(): Promise<void>;
}

export class AntigravityArtifactStore implements IAntigravityArtifactStore {
  private artifacts: Map<string,Artifact> = new Map();
  create(agentId:string,type:ArtifactType,title:string,content:string,status:ArtifactStatus='pending'): Artifact {
    const now = new Date().toISOString();
    const a: Artifact = { id: crypto.randomUUID(), agentId, type, title, content, status, comments:[], createdAt:now, updatedAt:now };
    this.artifacts.set(a.id, a); return a;
  }
  get(id:string): Artifact|undefined { return this.artifacts.get(id); }
  getByAgent(agentId:string): Artifact[] { return [...this.artifacts.values()].filter(a=>a.agentId===agentId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)); }
  getByType(type:ArtifactType): Artifact[] { return [...this.artifacts.values()].filter(a=>a.type===type); }
  addComment(artifactId:string,author:'user'|'agent',content:string): ArtifactComment|undefined {
    const a=this.artifacts.get(artifactId); if(!a) return undefined;
    const c: ArtifactComment = { id: crypto.randomUUID(), author, content, timestamp: new Date().toISOString() };
    a.comments.push(c); a.updatedAt = new Date().toISOString(); return c;
  }
  async save(): Promise<void> {
    try { const { writeFileSync, mkdirSync } = require('fs'); const { join } = require('path');
      const dir = join(process.cwd(), '.antigravity'); mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'artifacts.json'), JSON.stringify([...this.artifacts.values()], null, 2), 'utf-8');
    } catch {}
  }
  async load(): Promise<void> {
    try { const { existsSync, readFileSync } = require('fs'); const { join } = require('path');
      const fp = join(process.cwd(), '.antigravity', 'artifacts.json');
      if (!existsSync(fp)) return;
      const d = JSON.parse(readFileSync(fp, 'utf-8'));
      this.artifacts.clear(); for (const a of d) this.artifacts.set(a.id, a);
    } catch {}
  }
}
