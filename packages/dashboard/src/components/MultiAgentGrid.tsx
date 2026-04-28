"use client";
import { AgentCard } from "./AgentCard";

interface Agent {
  id: string;
  name: string;
  role: "coder" | "tester" | "reviewer" | "planner" | "general";
  status: "idle" | "planning" | "executing" | "done" | "error";
  currentTask?: string;
  progress?: { total: number; completed: number };
}

const dummyAgents: Agent[] = [
  { id: "1", name: "Code Agent", role: "coder", status: "executing", currentTask: "Implementing auth middleware", progress: { total: 3, completed: 1 } },
  { id: "2", name: "Test Agent", role: "tester", status: "idle", currentTask: "Waiting for code..." },
  { id: "3", name: "Review Agent", role: "reviewer", status: "done", currentTask: "Reviewed PR #42" },
];

export function MultiAgentGrid() {
  return (
    <div className="p-3 border-t border-ag-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-ag-muted uppercase tracking-wider">
          Active Agents ({dummyAgents.length})
        </span>
        <button className="text-xs text-ag-accent hover:underline">+ Spawn Agent</button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {dummyAgents.map((a) => (
          <AgentCard
            key={a.id}
            name={`${a.name} (${a.role})`}
            status={a.status}
            task={a.currentTask}
            progress={a.progress}
          />
        ))}
      </div>
    </div>
  );
}
