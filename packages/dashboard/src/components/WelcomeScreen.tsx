"use client";
import { FolderOpen, MessageSquare, GitBranch } from "lucide-react";

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 rounded-2xl bg-ag-accent/20 flex items-center justify-center mx-auto mb-6">
          <div className="w-10 h-10 rounded-lg bg-ag-accent flex items-center justify-center text-xl font-bold text-white">A</div>
        </div>
        <h1 className="text-xl font-semibold mb-2">Open-Antigravity Agent Manager</h1>
        <p className="text-ag-muted text-sm mb-8">
          Delegate complex tasks to AI agents. Spawn, monitor, and interact with agents that plan, code, test, and verify
          autonomously.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <button className="card p-4 hover:border-ag-accent/50 transition text-left">
            <FolderOpen size={20} className="text-ag-accent mb-2" />
            <div className="text-sm font-medium">Open Folder</div>
            <div className="text-xs text-ag-muted">Load a workspace</div>
          </button>
          <button onClick={onStart} className="card p-4 hover:border-ag-accent/50 transition text-left">
            <MessageSquare size={20} className="text-ag-success mb-2" />
            <div className="text-sm font-medium">Start Conversation</div>
            <div className="text-xs text-ag-muted">Begin a new agent session</div>
          </button>
          <button className="card p-4 hover:border-ag-accent/50 transition text-left">
            <GitBranch size={20} className="text-ag-warning mb-2" />
            <div className="text-sm font-medium">Clone Repository</div>
            <div className="text-xs text-ag-muted">Git clone a project</div>
          </button>
        </div>

        <button onClick={onStart} className="btn-primary text-sm px-6 py-2.5">
          Start Conversation
        </button>
      </div>
    </div>
  );
}
