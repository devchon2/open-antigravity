import * as vscode from "vscode";
import { streamChat, getGatewayUrl } from "../services/gateway.js";

export class ChatPanel {
  static currentPanel: ChatPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(extensionUri: vscode.Uri) {
    this.panel = vscode.window.createWebviewPanel(
      "open-antigravity.chat",
      "Open-Antigravity Agent",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist", "webview")],
      }
    );

    this.panel.webview.html = this.getHtml(extensionUri);
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (msg: { type: string; model: string; messages: Array<{ role: string; content: string }> }) => {
        if (msg.type === "chat") {
          await streamChat(
            msg.messages,
            msg.model,
            (text: string) => this.panel.webview.postMessage({ type: "chunk", content: text }),
            () => this.panel.webview.postMessage({ type: "done" }),
            (error: string) => this.panel.webview.postMessage({ type: "error", message: error })
          );
        }
      },
      null,
      this.disposables
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

  private getHtml(extensionUri: vscode.Uri): string {
    const webviewUri = vscode.Uri.joinPath(extensionUri, "dist", "webview", "index.html");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agent Chat</title>
  <style>
    :root {
      --vscode-editor-background: #1e1e1e;
      --vscode-editor-foreground: #d4d4d4;
      --vscode-panel-border: #333;
      --vscode-button-background: #007acc;
      --vscode-input-background: #3c3c3c;
      --vscode-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    body { margin: 0; padding: 0; height: 100vh; }
  </style>
</head>
<body>
  <script>
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', function(e) { vscode.postMessage(e.data); });
  </script>
</body>
</html>`;
  }

  dispose(): void {
    ChatPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
