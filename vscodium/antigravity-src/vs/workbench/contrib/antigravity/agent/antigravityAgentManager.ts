/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Agent Manager — Multi-Agent Orchestration
 *  Spawn, monitor, and kill multiple agents simultaneously.
 *  Powers the Mission Control dashboard.
 *--------------------------------------------------------------------------------------------*/

import { AntigravityAgentEngine } from './antigravityAgentEngine.js';

export interface AgentInstance {
  id: string; name: string; role: 'coder' | 'tester' | 'reviewer' | 'planner' | 'general';
  model: string; status: string; engine: AntigravityAgentEngine;
  currentTask?: string; createdAt: string;
}

export class AntigravityAgentManager {
  private agents: Map<string, AgentInstance> = new Map();

  spawn(name: string, role: AgentInstance['role'] = 'general', model?: string): AgentInstance {
    const inst: AgentInstance = {
      id: crypto.randomUUID(),
      name,
      role,
      model: model || 'gpt-4o',
      status: 'idle',
      engine: new AntigravityAgentEngine(model || 'gpt-4o'),
      createdAt: new Date().toISOString(),
    };
    this.agents.set(inst.id, inst);
    return inst;
  }

  get(id: string): AgentInstance | undefined { return this.agents.get(id); }

  getAll(): AgentInstance[] { return Array.from(this.agents.values()); }

  kill(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    agent.status = 'error';
    agent.engine.reset();
    this.agents.delete(id);
    return true;
  }

  pauseAll(): void {
    for (const agent of this.agents.values()) {
      if (agent.status === 'executing' || agent.status === 'planning') {
        agent.status = 'idle';
      }
    }
  }

  getStatusSummary(): Record<string, number> {
    const summary: Record<string, number> = { idle: 0, planning: 0, executing: 0, done: 0, error: 0 };
    for (const agent of this.agents.values()) {
      summary[agent.status] = (summary[agent.status] || 0) + 1;
    }
    return summary;
  }

  async *runTask(agentId: string, task: string, mode: 'fast' | 'planning' = 'fast'): AsyncIterable<{ agentId: string; type: string; content?: string }> {
    const agent = this.agents.get(agentId);
    if (!agent) { yield { agentId, type: 'error', content: 'Agent not found' }; return; }

    agent.status = mode === 'planning' ? 'planning' : 'executing';
    agent.currentTask = task;

    for await (const chunk of agent.engine.run(task, mode)) {
      if (chunk === '[DONE]') {
        agent.status = 'done';
        agent.currentTask = undefined;
        yield { agentId, type: 'done' };
      } else {
        yield { agentId, type: 'chunk', content: chunk };
      }
    }
  }
}
