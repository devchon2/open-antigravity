"use client";
import { useState } from "react";
import { Folder, GitBranch, Plus, MessageSquare, Globe } from "lucide-react";
import { Inbox } from "./Inbox";

const workspaces = [
  { name: "open-antigravity", branch: "main", active: true },
  { name: "my-api-server", branch: "feature/auth", active: false },
];

type Tab = "inbox" | "workspaces" | "playground";

export function Sidebar() {
  const [tab, setTab] = useState<Tab>("inbox");

  return (
    <aside className="w-56 border-r border-ag-border bg-ag-surface flex flex-col shrink-0">
      {/* Tab selector */}
      <div className="flex border-b border-ag-border">
        {([
          ["inbox", "Inbox"],
          ["workspaces", "Workspaces"],
          ["playground", "Playground"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`flex-1 text-xs py-1.5 text-center border-b-2 transition ${
              tab === key
                ? "border-ag-accent text-ag-accent"
                : "border-transparent text-ag-muted hover:text-ag-text"
            }`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "inbox" && <Inbox />}

      {tab === "workspaces" && (
        <>
          <div className="p-3 border-b border-ag-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ag-muted uppercase tracking-wider">Folders</span>
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
          <div className="flex-1" />
        </>
      )}

      {tab === "playground" && (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
          <MessageSquare size={24} className="text-ag-muted mb-2" />
          <p className="text-xs text-ag-muted mb-1">Scratch area</p>
          <p className="text-xs text-ag-muted opacity-60">
            Ad-hoc conversations that can be converted to proper workspaces later.
          </p>
        </div>
      )}

      {/* Bottom bar */}
      <div className="p-2 border-t border-ag-border">
        <button className="flex items-center gap-1.5 text-xs text-ag-muted hover:text-ag-text w-full">
          <Globe size={12} />
          <span>Browser Agent</span>
        </button>
      </div>
    </aside>
  );
}
