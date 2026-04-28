"use client";
import { useState, useRef, useEffect } from "react";
import { ModelSelector } from "./ModelSelector";
import { MultiAgentGrid } from "./MultiAgentGrid";
import { ArtifactsPanel } from "./ArtifactsPanel";
import { Send, LayoutGrid, PanelRightOpen } from "lucide-react";

interface Message {
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"fast" | "planning">("fast");
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: input, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamText("");

    try {
      const allMsgs = [...messages, userMsg].map((m) => ({ role: m.role === "agent" ? "assistant" : m.role, content: m.content }));
      const resp = await fetch("http://localhost:4001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer antigravity-local-dev-key" },
        body: JSON.stringify({ model: "gpt-4o", messages: allMsgs, stream: true }),
      });
      if (!resp.ok) throw new Error("Gateway error " + resp.status);

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");
      const dec = new TextDecoder();
      let buf = "", full = "";

      let doneReading = false;
      while (!doneReading) {
        const { value, done } = await reader.read();
        if (done) { doneReading = true; break; }
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const l of lines) {
          if (!l.startsWith("data: ")) continue;
          const d = l.slice(6).trim();
          if (!d || d === "[DONE]") continue;
          try {
            const chunk = JSON.parse(d);
            if (chunk.type === "text" && chunk.content) {
              full += chunk.content;
              setStreamText(full);
            }
            if (chunk.type === "error") throw new Error(chunk.content || "Unknown error");
          } catch { void 0 }
        }
      }

      setMessages((prev) => [...prev, { role: "agent", content: full, timestamp: new Date().toISOString() }]);
      setStreamText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setStreamText("Error: " + msg + "\n\nMake sure the gateway is running:\n`npm run dev:gateway`");
    }
    setIsStreaming(false);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-ag-border shrink-0">
          <ModelSelector />
          <div className="flex items-center gap-1 bg-ag-surface border border-ag-border rounded p-0.5">
            <button
              className={`px-2 py-0.5 rounded text-xs ${mode === "fast" ? "bg-ag-accent/20 text-ag-accent" : "text-ag-muted"}`}
              onClick={() => setMode("fast")}
            >
              Fast
            </button>
            <button
              className={`px-2 py-0.5 rounded text-xs ${mode === "planning" ? "bg-ag-accent/20 text-ag-accent" : "text-ag-muted"}`}
              onClick={() => setMode("planning")}
            >
              Planning
            </button>
          </div>
          <div className="flex-1" />
          <button
            className={`btn-ghost text-xs ${showArtifacts ? "text-ag-accent" : ""}`}
            onClick={() => setShowArtifacts(!showArtifacts)}
          >
            <PanelRightOpen size={14} />
          </button>
          <button className="btn-ghost text-xs">
            <LayoutGrid size={14} />
          </button>
        </div>

        {/* Multi-Agent Grid (Mission Control) */}
        <MultiAgentGrid />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-ag-muted text-sm pt-20">
              <div className="w-10 h-10 rounded-full bg-ag-accent/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-ag-accent text-lg font-bold">A</span>
              </div>
              <p className="font-medium">Ask anything</p>
              <p className="text-xs mt-1">
                The agent can plan, execute, and verify tasks across your workspace
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-ag-user text-ag-text"
                    : "bg-ag-surface border border-ag-border"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}

          {streamText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-2.5 rounded-lg text-sm bg-ag-surface border border-ag-border">
                <div className="whitespace-pre-wrap">{streamText}</div>
                {isStreaming && <span className="inline-block w-2 h-4 bg-ag-accent animate-pulse ml-0.5" />}
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-ag-border shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Ask anything..."
              rows={1}
              className="input-field flex-1 resize-none"
              disabled={isStreaming}
            />
            <button onClick={handleSend} disabled={isStreaming || !input.trim()} className="btn-primary p-2">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Artifacts panel */}
      {showArtifacts && <ArtifactsPanel onClose={() => setShowArtifacts(false)} />}
    </div>
  );
}
