"use client";

export function TopBar({ onInbox }: { onInbox?: () => void }) {
  return (
    <header className="h-11 border-b border-ag-border flex items-center px-4 gap-3 bg-ag-surface shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-ag-accent flex items-center justify-center text-xs font-bold text-white">A</div>
        <span className="font-semibold text-sm">Open-Antigravity</span>
      </div>
      <div className="flex-1" />
      {onInbox && (
        <button className="btn-ghost text-xs" title="Inbox" onClick={onInbox}>
          Inbox
        </button>
      )}
      <button className="btn-ghost text-xs" title="Toggle Artifacts">
        Artifacts
      </button>
      <button className="btn-ghost text-xs font-medium" title="Review Changes">
        Review changes
      </button>
      <button className="btn-primary text-xs py-1 px-3" title="Open Editor">
        Open Editor
      </button>
    </header>
  );
}
