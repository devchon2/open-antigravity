/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Agent Manager View (Cmd+E)
 *  Mission Control dashboard — Inbox, Agent Cards, Workspaces, Playground.
 *  The primary orchestration surface for multi-agent workflow.
 *--------------------------------------------------------------------------------------------*/

export class AgentManagerView {
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
    --card-bg: #1a2332;
    --success: #3fb950;
    --warning: #d2991d;
    --error: #f85149;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:var(--vscode-font-family); font-size:13px; background:var(--bg); color:var(--fg); height:100vh; display:flex; flex-direction:column; }
  .header { padding:12px; border-bottom:1px solid var(--border); }
  .header h2 { font-size:14px; font-weight:600; margin-bottom:4px; }
  .header p { font-size:11px; opacity:0.6; }
  .tabs { display:flex; border-bottom:1px solid var(--border); }
  .tab { flex:1; text-align:center; padding:8px; font-size:12px; cursor:pointer; border-bottom:2px solid transparent; color:var(--fg); opacity:0.6; }
  .tab.active { border-bottom-color:var(--accent); opacity:1; }
  .tab:hover { opacity:0.8; }
  .content { flex:1; overflow-y:auto; padding:8px; }
  .card { background:var(--card-bg); border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:8px; cursor:pointer; }
  .card:hover { border-color:var(--accent); }
  .card-header { display:flex; align-items:center; gap:8px; margin-bottom:4px; }
  .card-title { font-weight:600; font-size:13px; }
  .card-meta { font-size:11px; opacity:0.6; margin-top:4px; }
  .status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
  .status-dot.idle { background:var(--fg); opacity:0.3; }
  .status-dot.executing { background:var(--accent); animation:pulse 1s infinite; }
  .status-dot.done { background:var(--success); }
  .status-dot.error { background:var(--error); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .toolbar { display:flex; padding:8px; gap:6px; border-top:1px solid var(--border); }
  .toolbar button { flex:1; padding:8px; font-size:12px; border:1px solid var(--border); border-radius:6px; background:var(--input-bg); color:var(--fg); cursor:pointer; }
  .toolbar button.primary { background:var(--accent); border-color:var(--accent); font-weight:600; }
  .input-area { padding:0 8px 8px 8px; }
  #agentInput { width:100%; background:var(--input-bg); color:var(--fg); border:1px solid var(--border); border-radius:6px; padding:8px; font-family:inherit; font-size:13px; resize:none; }
  #agentInput:focus { outline:1px solid var(--accent); }
  .artifact-badge { display:inline-block; padding:1px 6px; border-radius:4px; font-size:10px; margin-right:4px; }
  .artifact-badge.plan { background:#58a6ff22; color:#58a6ff; }
  .artifact-badge.diff { background:#3fb95022; color:#3fb950; }
  .artifact-badge.screenshot { background:#d2991d22; color:#d2991d; }
  .section-title { font-size:11px; font-weight:600; text-transform:uppercase; opacity:0.5; margin:12px 0 6px 0; letter-spacing:1px; }
</style>
</head>
<body>
<div class="header">
  <h2>Agent Manager</h2>
  <p>Mission Control — Orchestrate AI agents</p>
</div>
<div class="tabs">
  <div class="tab active" data-tab="inbox">Inbox</div>
  <div class="tab" data-tab="agents">Agents</div>
  <div class="tab" data-tab="playground">Playground</div>
</div>
<div class="content" id="content">
  <!-- Inbox: conversation list -->
  <div id="tab-inbox">
    <div class="section-title">Recent Conversations</div>
    <div id="inbox-list">
      <div class="card" onclick="vscode.postMessage({command:'openConversation',id:'demo'})">
        <div class="card-header"><span class="status-dot done"></span><span class="card-title">Implement auth middleware</span></div>
        <div class="card-meta">GPT-4o · 12 messages · 10 min ago</div>
      </div>
      <div class="card" onclick="vscode.postMessage({command:'openConversation',id:'demo2'})">
        <div class="card-header"><span class="status-dot executing"></span><span class="card-title">Fix type errors in dashboard</span></div>
        <div class="card-meta">Claude Sonnet 4.6 · 5 messages · 2 min ago</div>
      </div>
    </div>
  </div>
  <!-- Agents: active agent cards -->
  <div id="tab-agents" style="display:none">
    <div class="section-title">Active Agents</div>
    <div id="agents-list">
      <div class="card">
        <div class="card-header"><span class="status-dot executing"></span><span class="card-title">Agent 1 (coder)</span></div>
        <div class="card-meta">Implementing auth endpoint · 1/3 tasks</div>
        <div style="margin-top:6px;height:3px;background:var(--border);border-radius:2px;"><div style="width:33%;height:100%;background:var(--accent);border-radius:2px;"></div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="status-dot done"></span><span class="card-title">Agent 2 (tester)</span></div>
        <div class="card-meta">Tests passed · Done</div>
      </div>
    </div>
  </div>
  <!-- Playground: scratch area -->
  <div id="tab-playground" style="display:none">
    <div class="section-title">Scratch Area</div>
    <p style="font-size:12px;opacity:0.5;text-align:center;padding:40px 20px;">Ad-hoc agent conversations.<br/>Convert to a workspace when ready.</p>
  </div>
</div>
<div class="input-area">
  <textarea id="agentInput" rows="2" placeholder="Ask anything... (e.g., 'Implement a REST API for user management')"></textarea>
</div>
<div class="toolbar">
  <button onclick="vscode.postMessage({command:'spawnAgent',text:document.getElementById('agentInput').value})">Spawn Agent</button>
  <button class="primary" onclick="vscode.postMessage({command:'startConversation',text:document.getElementById('agentInput').value})">Start</button>
</div>
<script>
  const vscode = acquireVsCodeApi();
  // Tab switching
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('[id^="tab-"]').forEach(x => x.style.display = 'none');
      document.getElementById('tab-' + this.dataset.tab).style.display = 'block';
    });
  });
  // Enter to send
  document.getElementById('agentInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      vscode.postMessage({command:'startConversation',text:this.value});
    }
  });
</script>
</body>
</html>`;
  }
}
