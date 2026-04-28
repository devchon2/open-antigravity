"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const MODELS = [
  { id: "gpt-5.2", name: "GPT-5.2", provider: "OpenAI" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic" },
  { id: "claude-opus-4-7", name: "Claude Opus 4.7", provider: "Anthropic" },
  { id: "gemini-3-pro", name: "Gemini 3 Pro", provider: "Google" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "Google" },
];

export function ModelSelector() {
  const [selected, setSelected] = useState(MODELS[0]);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-ag-muted hover:text-ag-text px-2 py-1 rounded border border-ag-border"
      >
        {selected.name}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 card py-1 w-52 z-50 shadow-lg">
          {MODELS.map((m) => (
            <button
              key={m.id}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-ag-accent/10 ${
                m.id === selected.id ? "text-ag-accent" : "text-ag-text"
              }`}
              onClick={() => {
                setSelected(m);
                setOpen(false);
              }}
            >
              <div>{m.name}</div>
              <div className="text-ag-muted" style={{ fontSize: 10 }}>{m.provider}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
