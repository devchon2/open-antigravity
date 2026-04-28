import React, { useState, useRef, useEffect, useCallback } from "react";
import { useVSCodeAPI } from "./hooks/useVSCodeAPI";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
  { id: "gemini-3-pro", name: "Gemini 3 Pro" },
  { id: "llama3", name: "Llama 3 (Local)" },
];

export const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [assistantMsg, setAssistantMsg] = useState("");
  const vscode = useVSCodeAPI();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, assistantMsg]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setAssistantMsg("");

    vscode.postMessage({ type: "chat", model, messages: [...messages, userMsg] });
  }, [input, loading, model, messages, vscode]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === "chunk") {
        setAssistantMsg((prev) => prev + (msg.content || ""));
      } else if (msg.type === "done") {
        setAssistantMsg((prev) => {
          setMessages((ms) => [...ms, { role: "assistant", content: prev }]);
          return "";
        });
        setLoading(false);
      } else if (msg.type === "error") {
        setLoading(false);
        setAssistantMsg((prev) => prev + "\n\n**Error:** " + msg.message);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{ background: "var(--input-bg)", color: "var(--fg)", border: "1px solid var(--border)", padding: 4, borderRadius: 4, fontSize: 12 }}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <span style={{ fontSize: 11, opacity: 0.6 }}>Cmd+L | Agent Chat</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
              {m.role === "user" ? "You" : "Agent"}
            </div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.content}</div>
          </div>
        ))}
        {assistantMsg && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Agent</div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{assistantMsg}</div>
          </div>
        )}
        {loading && !assistantMsg && (
          <div style={{ opacity: 0.5 }}>Thinking...</div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid var(--border)", padding: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the agent... (Enter to send, Shift+Enter for newline)"
          disabled={loading}
          rows={2}
          style={{
            width: "100%",
            background: "var(--input-bg)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: 8,
            fontSize: 12,
            resize: "none",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
};

export default App;
