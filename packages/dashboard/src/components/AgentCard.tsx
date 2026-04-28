"use client";
import { Circle, CheckCircle, Loader, XCircle } from "lucide-react";

interface AgentCardProps {
  name: string;
  status: "idle" | "planning" | "executing" | "verifying" | "done" | "error";
  task?: string;
  progress?: { total: number; completed: number };
}

const statusIcons: Record<string, React.ReactNode> = {
  idle: <Circle size={12} className="text-ag-muted" />,
  planning: <Loader size={12} className="text-ag-accent animate-spin" />,
  executing: <Loader size={12} className="text-ag-accent animate-spin" />,
  verifying: <Loader size={12} className="text-ag-warning animate-spin" />,
  done: <CheckCircle size={12} className="text-ag-success" />,
  error: <XCircle size={12} className="text-ag-error" />,
};

export function AgentCard({ name, status, task, progress }: AgentCardProps) {
  return (
    <div className="card p-3 hover:border-ag-accent/30 transition cursor-pointer">
      <div className="flex items-center gap-2 mb-1">
        {statusIcons[status]}
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-ag-muted capitalize ml-auto">{status}</span>
      </div>
      {task && <p className="text-xs text-ag-muted truncate">{task}</p>}
      {progress && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-ag-border rounded-full overflow-hidden">
            <div
              className="h-full bg-ag-accent rounded-full transition-all"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-ag-muted">
            {progress.completed}/{progress.total}
          </span>
        </div>
      )}
    </div>
  );
}
