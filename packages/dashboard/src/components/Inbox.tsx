"use client";
import { Clock, CheckCircle, AlertCircle, Loader } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  model: string;
  mode: "fast" | "planning";
  status: "active" | "completed" | "error";
  messageCount: number;
  agentCount: number;
  lastActivity: string;
}

const dummyConversations: Conversation[] = [
  { id: "1", title: "Implement auth middleware", model: "Claude Sonnet 4.6", mode: "planning", status: "completed", messageCount: 12, agentCount: 1, lastActivity: "10 min ago" },
  { id: "2", title: "Fix type errors in dashboard", model: "GPT-4o", mode: "fast", status: "active", messageCount: 5, agentCount: 2, lastActivity: "2 min ago" },
  { id: "3", title: "Generate unit tests for utils", model: "Gemini 3 Pro", mode: "fast", status: "error", messageCount: 8, agentCount: 1, lastActivity: "1 hour ago" },
  { id: "4", title: "Refactor database schema", model: "Claude Opus 4.7", mode: "planning", status: "completed", messageCount: 24, agentCount: 3, lastActivity: "yesterday" },
];

const statusIcons: Record<string, React.ReactNode> = {
  active: <Loader size={12} className="text-ag-accent animate-spin" />,
  completed: <CheckCircle size={12} className="text-ag-success" />,
  error: <AlertCircle size={12} className="text-ag-error" />,
};

export function Inbox() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 border-b border-ag-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-ag-muted uppercase tracking-wider">Inbox</span>
          <span className="text-xs text-ag-muted">{dummyConversations.length}</span>
        </div>
      </div>
      {dummyConversations.map((conv) => (
        <div
          key={conv.id}
          className="p-3 border-b border-ag-border hover:bg-ag-accent/5 cursor-pointer transition"
        >
          <div className="flex items-center gap-2 mb-1">
            {statusIcons[conv.status]}
            <span className="text-sm font-medium truncate">{conv.title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ag-muted">
            <span>{conv.model}</span>
            <span>·</span>
            <span className="capitalize">{conv.mode}</span>
            <span>·</span>
            <span>{conv.messageCount} msgs</span>
            {conv.agentCount > 1 && (
              <>
                <span>·</span>
                <span>{conv.agentCount} agents</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-ag-muted">
            <Clock size={10} />
            <span>{conv.lastActivity}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
