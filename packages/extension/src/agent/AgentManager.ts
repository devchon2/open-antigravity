import * as vscode from 'vscode';
import { AgentEngine } from './engine.js';
import { artifactStore, type Artifact } from '../artifacts/ArtifactStore.js';

export interface AgentInstance {
  id: string;
  name: string;
  role: 'coder' | 'tester' | 'reviewer' | 'planner' | 'general';
  model: string;
  status: 'idle' | 'planning' | 'executing' | 'done' | 'error';
  engine: AgentEngine;
  currentTask?: string;
  artifacts: string[];
  createdAt: string;
}

export class AgentManager {
  private agents: Map<string, AgentInstance> = new Map();

  /** Spawn a new agent */
  spawn(name: string, role: AgentInstance['role'] = 'general', model?: string): AgentInstance {
    const config = vscode.workspace.getConfiguration('open-antigravity');
    const agentModel = model || config.get<string>('defaultModel', 'gpt-4o');

    const agent: AgentInstance = {
      id: crypto.randomUUID(),
      name,
      role,
      model: agentModel,
      status: 'idle',
      engine: new AgentEngine(agentModel),
      artifacts: [],
      createdAt: new Date().toISOString(),
    };

    this.agents.set(agent.id, agent);
    return agent;
  }

  /** Get all agents */
  getAll(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  /** Get agent by ID */
  get(id: string): AgentInstance | undefined {
    return this.agents.get(id);
  }

  /** Kill an agent */
  kill(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    agent.status = 'error';
    this.agents.delete(id);
    return true;
  }

  /** Run a task on an agent */
  async *runTask(agentId: string, task: string, mode: 'fast' | 'planning' = 'fast'): AsyncIterable<{
    agentId: string;
    type: 'chunk' | 'done' | 'error' | 'artifact';
    content?: string;
    artifact?: Artifact;
  }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      yield { agentId, type: 'error', content: 'Agent not found' };
      return;
    }

    agent.status = mode === 'planning' ? 'planning' : 'executing';
    agent.currentTask = task;

    for await (const chunk of agent.engine.run(task, mode)) {
      if (chunk === '[DONE]') {
        agent.status = 'done';
        agent.currentTask = undefined;

        // Collect artifacts produced by this run
        agent.artifacts = artifactStore.getByAgent(agent.id).map((a) => a.id);

        yield { agentId, type: 'done' };
      } else {
        yield { agentId, type: 'chunk', content: chunk };
      }
    }
  }

  /** Spawn a tester agent that reviews the coder's output */
  async spawnTesterFor(coderId: string): Promise<AgentInstance | null> {
    const coder = this.agents.get(coderId);
    if (!coder) return null;

    const tester = this.spawn(`${coder.name}-tester`, 'tester', coder.model);
    return tester;
  }

  /** Get agents grouped by status for Mission Control */
  getStatusSummary(): Record<string, number> {
    const summary: Record<string, number> = { idle: 0, planning: 0, executing: 0, done: 0, error: 0 };
    for (const agent of this.agents.values()) {
      summary[agent.status] = (summary[agent.status] || 0) + 1;
    }
    return summary;
  }

  /** Pause all agents */
  pauseAll(): void {
    for (const agent of this.agents.values()) {
      if (agent.status === 'executing' || agent.status === 'planning') {
        agent.status = 'idle';
      }
    }
  }
}

export const agentManager = new AgentManager();
