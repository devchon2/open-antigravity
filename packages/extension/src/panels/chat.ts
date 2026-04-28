import * as vscode from 'vscode';
import { AgentEngine } from '../agent/engine.js';

const CHAT_VIEW_ID = 'open-antigravity.chatView';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private agent: AgentEngine;

  constructor(private readonly extensionUri: vscode.Uri) {
    const config = vscode.workspace.getConfiguration('open-antigravity');
    this.agent = new AgentEngine(config.get<string>('defaultModel', 'gpt-4o'));
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'sendMessage':
          await this.handleChat(message.text, message.mode || 'fast');
          break;
        case 'resetConversation':
          this.agent.reset();
          this.postMessage({ command: 'conversationReset' });
          break;
      }
    });
  }

  public show(): void {
    if (this.view) {
      this.view.show(true);
    }
  }

  private async handleChat(text: string, mode: 'fast' | 'planning'): Promise<void> {
    if (!this.view) return;

    this.postMessage({ command: 'streamStart', text });

    try {
      for await (const chunk of this.agent.run(text, mode)) {
        if (chunk === '[DONE]') {
          this.postMessage({ command: 'streamEnd' });
          break;
        } else {
          this.postMessage({ command: 'streamChunk', text: chunk });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.postMessage({ command: 'error', text: message });
    }
  }

  private postMessage(message: Record<string, unknown>): void {
    this.view?.webview.postMessage(message);
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Open Antigravity Chat</title>
  <style>
    :root {
      --bg: var(--vscode-sideBar-background, #1e1e2e);
      --fg: var(--vscode-sideBar-foreground, #cdd6f4);
      --border: var(--vscode-panel-border, #313244);
      --input-bg: var(--vscode-input-background, #181825);
      --accent: #4f8ff7;
      --user-bg: #2a3f5f;
      --agent-bg: #3a3a4a;
      --error: #f38ba8;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family, -apple-system, sans-serif);
      font-size: 13px;
      background: var(--bg);
      color: var(--fg);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .message {
      padding: 8px 12px;
      border-radius: 8px;
      max-width: 100%;
      word-wrap: break-word;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .message.user {
      background: var(--user-bg);
      align-self: flex-end;
    }
    .message.agent {
      background: var(--agent-bg);
      align-self: flex-start;
      border-left: 3px solid var(--accent);
    }
    .message.error {
      background: var(--error);
      color: #1e1e2e;
      font-weight: bold;
    }
    .message.system {
      text-align: center;
      font-size: 11px;
      opacity: 0.6;
    }
    .spinner {
      display: none;
      width: 12px;
      height: 12px;
      border: 2px solid var(--fg);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 4px 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .input-area {
      padding: 8px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 6px;
      align-items: flex-end;
    }
    #input {
      flex: 1;
      background: var(--input-bg);
      color: var(--fg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 12px;
      resize: none;
      min-height: 36px;
      max-height: 120px;
      font-family: inherit;
      font-size: 13px;
    }
    #input:focus { outline: 1px solid var(--accent); }
    button {
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
    }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.4; cursor: default; }
    .toolbar {
      display: flex;
      padding: 4px 8px;
      gap: 4px;
      border-top: 1px solid var(--border);
    }
    .toolbar label { font-size: 11px; display: flex; align-items: center; gap: 4px; }
    .toolbar select { font-size: 11px; background: var(--input-bg); color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 2px 4px; }
    .toolbar button { padding: 2px 8px; font-size: 11px; }
    code { background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
    pre { background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
  </style>
</head>
<body>
  <div id="messages"></div>
  <div class="toolbar">
    <label>Mode:
      <select id="modeSelect">
        <option value="fast">Fast</option>
        <option value="planning">Planning</option>
      </select>
    </label>
    <div class="spinner" id="spinner"></div>
    <div style="flex:1"></div>
    <button id="artifactsBtn" title="Toggle artifacts">Artifacts</button>
	    <button id="resetBtn" title="Reset conversation">Reset</button>
	  </div>
	  <div id="artifactsPanel" style="display:none;max-height:200px;overflow-y:auto;border-top:1px solid var(--border);padding:8px;">
	    <div style="font-size:11px;font-weight:600;margin-bottom:4px;color:var(--ccent);">Artifacts</div>
	    <div id="artifactsList"></div>
  </div>
  <div class="input-area">
    <textarea id="input" rows="1" placeholder="Ask the agent to do something... (Ctrl+Enter to send)"></textarea>
    <button id="sendBtn">Send</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('sendBtn');
    const artifactsBtn = document.getElementById("artifactsBtn");
	    const resetBtn = document.getElementById('resetBtn');
    const modeSelect = document.getElementById('modeSelect');
    const spinner = document.getElementById('spinner');
    let isStreaming = false;
    let streamMsg = null;

    function addMessage(role, text, extraClass) {
      const div = document.createElement('div');
      div.className = 'message ' + role + (extraClass ? ' ' + extraClass : '');
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      return div;
    }

    function send() {
      const text = input.value.trim();
      if (!text || isStreaming) return;
      const mode = modeSelect.value;
      addMessage('user', text);
      input.value = '';
      isStreaming = true;
      sendBtn.disabled = true;
      spinner.style.display = 'block';
      streamMsg = addMessage('agent', '');
      vscode.postMessage({ command: 'sendMessage', text: text, mode: mode });
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
    });
    resetBtn.addEventListener('click', function() {
      vscode.postMessage({ command: 'resetConversation' });
    });

    window.addEventListener('message', function(event) {
      const msg = event.data;
      switch (msg.command) {
        case 'streamStart':
          if (streamMsg) streamMsg.textContent = '';
          break;
        case 'streamChunk':
          if (streamMsg) streamMsg.textContent += msg.text;
          messages.scrollTop = messages.scrollHeight;
          break;
        case 'streamEnd':
          isStreaming = false;
          sendBtn.disabled = false;
          spinner.style.display = 'none';
          streamMsg = null;
          if (messages.lastChild && messages.lastChild.textContent === '') {
            messages.lastChild.textContent = '(empty response)';
          }
          break;
        case 'conversationReset':
          messages.innerHTML = '';
          streamMsg = null;
          break;
        case 'error':
	        case 'artifactsList': {
	          const list = document.getElementById('artifactsList');
	          list.innerHTML = msg.artifacts.map(function(a) {
	            const icons = {task_list:'📋',plan:'📐',diff:'📝',walkthrough:'📖',screenshot:'📸',test_result:'🧪'};
	            const icon = icons[a.type] || '📄';
	            const statusColor = a.status==='completed'?'color:#3fb950;':'color:#d2991d;';
	            return '<div style="padding:4px 0;border-bottom:1px solid var(--border);"><span>' + icon + '</span> <b>' + a.title + '</b> <span style="font-size:10px;' + statusColor + '">' + a.status + '</span></div>';
	          }).join('');
	          break;
	        }

          addMessage('error', msg.text);
          isStreaming = false;
          sendBtn.disabled = false;
          spinner.style.display = 'none';
          break;
      }
    });

    input.focus();
  </script>
</body>
</html>`;
  }
}
