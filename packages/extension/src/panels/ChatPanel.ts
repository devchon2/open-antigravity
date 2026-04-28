import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { streamChat } from '../services/gateway.js';

export class ChatPanel {
  static currentPanel: ChatPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(extensionUri: vscode.Uri) {
    this.panel = vscode.window.createWebviewPanel(
      'open-antigravity.chat',
      'Open-Antigravity Agent',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist', 'webview'),
        ],
      },
    );

    this.panel.webview.html = this.buildHtml(extensionUri);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (msg: {
        type: string;
        model?: string;
        messages?: Array<{ role: string; content: string }>;
        system?: string;
      }) => {
        if (msg.type === 'chat' && msg.model && msg.messages) {
          try {
            for await (const chunk of streamChat(msg.model, msg.messages, msg.system)) {
              this.panel.webview.postMessage(chunk);
            }
            this.panel.webview.postMessage({ type: 'done' });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            this.panel.webview.postMessage({ type: 'error', content: message });
          }
        }
      },
      null,
      this.disposables,
    );
  }

  static createOrShow(extensionUri: vscode.Uri): ChatPanel {
    if (ChatPanel.currentPanel) {
      ChatPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      return ChatPanel.currentPanel;
    }
    ChatPanel.currentPanel = new ChatPanel(extensionUri);
    return ChatPanel.currentPanel;
  }

  private buildHtml(extensionUri: vscode.Uri): string {
    const webviewDir = vscode.Uri.joinPath(extensionUri, 'dist', 'webview');
    const htmlPath = path.join(webviewDir.fsPath, 'index.html');

    try {
      let html = fs.readFileSync(htmlPath, 'utf-8');

      // Rewrite asset paths for webview CSP
      const assetsDir = vscode.Uri.joinPath(webviewDir, 'assets');
      html = html.replace(
        /\/assets\/([^"']+)/g,
        (_match, file) => this.panel.webview.asWebviewUri(vscode.Uri.joinPath(assetsDir, file)).toString(),
      );

      return html;
    } catch {
      return this.fallbackHtml();
    }
  }

  private fallbackHtml(): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><style>body{font-family:sans-serif;padding:20px;color:#ccc;background:#1e1e1e}</style></head>
<body>
  <h2>Open-Antigravity Agent</h2>
  <p>Build the webview UI first: <code>cd packages/extension/webview-ui && npm run build</code></p>
  <script>const vscode=acquireVsCodeApi();window.addEventListener('message',e=>vscode.postMessage(e.data))</script>
</body></html>`;
  }

  dispose(): void {
    ChatPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
