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
    const msg: Message = { role: "user", content: input, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, msg]);
    setInput("");
    setIsStreaming(true);
    setStreamText("");

    // TODO: connect to gateway backend
    setTimeout(() => {
      const resp: Message = {
        role: "agent",
        content: `I'm your Open-Antigravity agent. You asked: "${input}"\n\nThis is the Mission Control dashboard — the central hub for orchestrating AI agents. From here you can:\n\n- Spawn multiple agents on different tasks\n- Monitor their progress in real-time\n- Review artifacts (diffs, screenshots, test results)\n- Switch between Planning and Fast mode\n- Provide feedback through artifact comments\n\nTo connect to a real LLM, start the gateway:\n\`\`\`bash\nnpm run dev:gateway\n\`\`\``,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, resp]);
      setStreamText("");
      setIsStreaming(false);
    }, 1200);

    // Simulate streaming text
    const demo = "Analyzing your request and connecting to the agent gateway...\n\nReady to help! ";
    let i = 0;
    const interval = setInterval(() => {
      if (i < demo.length) {
        setStreamText(demo.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30);
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
