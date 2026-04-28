/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Agent Chat View (Cmd+L)
 *  Right-side panel webview — the main agent interaction surface.
 *  Supports: chat messages, streaming text, @ context, / workflows,
 *  Fast/Planning mode, model selector, approve/reject workflow.
 *--------------------------------------------------------------------------------------------*/

import { IWebviewService, Webview } from '../../../../../platform/webview/common/webview.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';

export class AgentChatView extends Disposable {
  private webview: Webview | null = null;

  constructor(@IWebviewService private readonly webviewService: IWebviewService) {
    super();
  }

  getHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  :root {
    --bg: var(--vscode-sideBar-background, #1e1e2e);
    --fg: var(--vscode-sideBar-foreground, #cdd6f4);
    --border: var(--vscode-panel-border, #313244);
    --input-bg: var(--vscode-input-background, #181825);
    --accent: #4f8ff7;
    --user-bg: #1f3a5f;
    --agent-bg: #1a2332;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:var(--vscode-font-family); font-size:13px; background:var(--bg); color:var(--fg); height:100vh; display:flex; flex-direction:column; }
  #messages { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; }
  .msg { padding:8px 12px; border-radius:8px; max-width:100%; white-space:pre-wrap; line-height:1.5; }
  .msg.user { background:var(--user-bg); align-self:flex-end; border-bottom-right-radius:2px; }
  .msg.agent { background:var(--agent-bg); align-self:flex-start; border-left:3px solid var(--accent); }
  .msg.error { background:#f38ba8; color:#1e1e2e; font-weight:600; }
  .msg.system { text-align:center; font-size:11px; opacity:0.6; }
  code { background:rgba(0,0,0,0.3); padding:1px 4px; border-radius:3px; font-size:12px; }
  pre { background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; overflow-x:auto; }
  pre code { background:none; padding:0; }
  .toolbar { display:flex; padding:4px 8px; gap:4px; border-top:1px solid var(--border); align-items:center; }
  .toolbar select, .toolbar button { font-size:11px; background:var(--input-bg); color:var(--fg); border:1px solid var(--border); border-radius:4px; padding:2px 6px; }
  .toolbar button:hover { background:var(--accent); }
  .input-area { padding:8px; border-top:1px solid var(--border); display:flex; gap:6px; }
  #input { flex:1; background:var(--input-bg); color:var(--fg); border:1px solid var(--border); border-radius:6px; padding:8px; resize:none; min-height:36px; font-family:inherit; font-size:13px; }
  #input:focus { outline:1px solid var(--accent); }
  #sendBtn { background:var(--accent); color:white; border:none; border-radius:6px; padding:8px 14px; cursor:pointer; font-size:13px; }
  #sendBtn:disabled { opacity:0.4; }
  .spinner { display:none; width:12px; height:12px; border:2px solid var(--fg); border-top-color:var(--accent); border-radius:50%; animation:spin 0.6s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .approval-bar { display:none; padding:8px; background:#1f3a5f; border-top:1px solid var(--accent); text-align:center; }
  .approval-bar button { margin:0 4px; }
</style>
</head>
<body>
<div id="messages"></div>
<div id="approval-bar" class="approval-bar">
  <span id="approval-text" style="margin-right:8px;font-size:12px;"></span>
  <button onclick="respondApproval('approve')" style="background:#3fb950;color:white;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;">Approve</button>
  <button onclick="respondApproval('reject')" style="background:#f85149;color:white;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;">Reject</button>
  <button onclick="respondApproval('approve_all')" style="background:#58a6ff;color:white;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;">Approve All</button>
</div>
<div class="toolbar">
  <select id="modelSelect">
    <option value="gpt-4o">GPT-4o</option>
    <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
    <option value="claude-opus-4-7">Claude Opus 4.7</option>
    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
    <option value="llama3">Llama 3 (Local)</option>
  </select>
  <select id="modeSelect">
    <option value="fast">Fast</option>
    <option value="planning">Planning</option>
  </select>
  <div class="spinner" id="spinner"></div>
  <div style="flex:1"></div>
  <button id="artifactsBtn">Artifacts</button>
  <button id="resetBtn">Reset</button>
</div>
<div class="input-area">
  <textarea id="input" rows="1" placeholder="Ask the agent... (Ctrl+Enter to send)"></textarea>
  <button id="sendBtn">Send</button>
</div>
<script>
  const vscode = acquireVsCodeApi();
  const msgsEl = document.getElementById('messages');
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('sendBtn');
  const spinner = document.getElementById('spinner');
  const approvalBar = document.getElementById('approval-bar');
  const approvalText = document.getElementById('approval-text');

  let isStreaming = false;
  let streamMsg = null;
  let pendingApprovalId = null;

  function addMsg(role, text, extraClass) {
    const d = document.createElement('div');
    d.className = 'msg ' + role + (extraClass ? ' ' + extraClass : '');
    d.textContent = text;
    msgsEl.appendChild(d);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return d;
  }

  function send() {
    const text = input.value.trim();
    if (!text || isStreaming) return;
    input.value = '';
    isStreaming = true;
    sendBtn.disabled = true;
    spinner.style.display = 'block';
    addMsg('user', text);
    streamMsg = addMsg('agent', '');
    const model = document.getElementById('modelSelect').value;
    const mode = document.getElementById('modeSelect').value;
    vscode.postMessage({ command: 'sendMessage', text, model, mode });
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
  });
  document.getElementById('resetBtn').addEventListener('click', () => vscode.postMessage({ command: 'reset' }));
  document.getElementById('artifactsBtn').addEventListener('click', () => vscode.postMessage({ command: 'getArtifacts' }));

  function respondApproval(action) {
    if (pendingApprovalId) {
      vscode.postMessage({ command: 'approvalResponse', id: pendingApprovalId, action });
      approvalBar.style.display = 'none';
      pendingApprovalId = null;
    }
  }

  window.addEventListener('message', function(event) {
    const msg = event.data;
    switch (msg.command) {
      case 'streamStart':
        if (streamMsg) streamMsg.textContent = '';
        break;
      case 'streamChunk':
        if (streamMsg) { streamMsg.textContent += msg.text || ''; msgsEl.scrollTop = msgsEl.scrollHeight; }
        break;
      case 'streamEnd':
        isStreaming = false; sendBtn.disabled = false; spinner.style.display = 'none'; streamMsg = null;
        break;
      case 'approvalRequest':
        pendingApprovalId = msg.id;
        approvalText.textContent = 'Agent wants to: ' + msg.description;
        approvalBar.style.display = 'block';
        break;
      case 'error':
        addMsg('error', msg.text); isStreaming = false; sendBtn.disabled = false; spinner.style.display = 'none';
        break;
      case 'conversationReset':
        msgsEl.innerHTML = ''; streamMsg = null;
        break;
    }
  });

  input.focus();
</script>
</body>
</html>`;
  }
}
