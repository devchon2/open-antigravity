"use client";
import { Folder, GitBranch, Plus, Users } from "lucide-react";

const workspaces = [
  { name: "open-antigravity", branch: "main", active: true },
  { name: "my-api-server", branch: "feature/auth", active: false },
];

export function Sidebar() {
  return (
    <aside className="w-56 border-r border-ag-border bg-ag-surface flex flex-col shrink-0">
      {/* Workspaces */}
      <div className="p-3 border-b border-ag-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ag-muted uppercase tracking-wider">Workspaces</span>
          <button className="text-ag-muted hover:text-ag-text" title="Add workspace">
            <Plus size={14} />
          </button>
        </div>
        {workspaces.map((w) => (
          <div
            key={w.name}
            className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer mb-1 ${
              w.active ? "bg-ag-accent/15 text-ag-accent" : "hover:bg-ag-surface text-ag-muted"
            }`}
          >
            <Folder size={14} />
            <span className="flex-1 truncate">{w.name}</span>
            <GitBranch size={12} />
            <span className="text-xs text-ag-muted">{w.branch}</span>
          </div>
        ))}
      </div>

      {/* Agent Status */}
      <div className="p-3 border-b border-ag-border">
        <div className="flex items-center gap-2 text-xs text-ag-muted mb-2">
          <Users size={14} />
          <span>Active Agents (0)</span>
        </div>
      </div>

      <div className="flex-1" />
      <div className="p-2 border-t border-ag-border">
        <button className="flex items-center gap-1 text-xs text-ag-muted hover:text-ag-text w-full">
          <span>Browser Agent</span>
        </button>
      </div>
    </aside>
  );
}
