"use client";
import { X, FileText, List, Code, Camera, Video } from "lucide-react";

interface Artifact {
  id: string;
  type: "task_list" | "plan" | "diff" | "screenshot" | "browser_recording" | "walkthrough";
  title: string;
  status: "pending" | "in_progress" | "completed";
  agentId: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  task_list: <List size={14} />,
  plan: <FileText size={14} />,
  diff: <Code size={14} />,
  screenshot: <Camera size={14} />,
  browser_recording: <Video size={14} />,
  walkthrough: <FileText size={14} />,
};

const dummyArtifacts: Artifact[] = [
  { id: "1", type: "task_list", title: "Implement auth endpoint", status: "completed", agentId: "agent-1" },
  { id: "2", type: "plan", title: "Architecture plan", status: "completed", agentId: "agent-1" },
  { id: "3", type: "diff", title: "auth.ts changes", status: "in_progress", agentId: "agent-1" },
];

export function ArtifactsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="w-80 border-l border-ag-border bg-ag-surface flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-ag-border">
        <span className="text-sm font-semibold">Artifacts</span>
        <button onClick={onClose} className="text-ag-muted hover:text-ag-text">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {dummyArtifacts.map((a) => (
          <div key={a.id} className="card p-2 mb-1 hover:border-ag-accent/30 transition cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="text-ag-muted">{typeIcons[a.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{a.title}</div>
                <div className="text-xs text-ag-muted capitalize">{a.type.replace("_", " ")}</div>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                a.status === "completed" ? "bg-ag-success/20 text-ag-success" : "bg-ag-warning/20 text-ag-warning"
              }`}>
                {a.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
