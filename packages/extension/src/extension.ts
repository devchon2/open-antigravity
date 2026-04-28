import * as vscode from 'vscode';
import { ChatViewProvider } from './panels/chat.js';
import { AgentEngine } from './agent/engine.js';

export function activate(context: vscode.ExtensionContext): void {
  // Chat panel
  const chatProvider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('open-antigravity.chatView', chatProvider),
  );

  // Open Chat command (Ctrl+L)
  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.openChat', () => {
      chatProvider.show();
    }),
  );

  // Open Agent Manager
  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.openAgentManager', () => {
      vscode.commands.executeCommand('workbench.view.extension.open-antigravity-sidebar');
    }),
  );

  // Explain Code command
  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.explainCode', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const text = editor.document.getText(selection.isEmpty ? undefined : selection);
      const lang = editor.document.languageId;

      const prompt = selection.isEmpty
        ? `Explain what this file does:\n\`\`\`${lang}\n${text.slice(0, 5000)}\n\`\`\``
        : `Explain this code:\n\`\`\`${lang}\n${text}\n\`\`\``;

      chatProvider.show();
      const agent = new AgentEngine(
        vscode.workspace.getConfiguration('open-antigravity').get<string>('defaultModel', 'gpt-4o'),
      );

      // We need to trigger the chat panel to process this
      vscode.commands.executeCommand('open-antigravity.openChat');
    }),
  );

  // Send to Agent command
  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.sendToAgent', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const text = editor.document.getText(editor.selection.isEmpty ? undefined : editor.selection);
      const filePath = vscode.workspace.asRelativePath(editor.document.uri);
      const prompt = `In file ${filePath}:\n\`\`\`\n${text.slice(0, 5000)}\n\`\`\``;

      chatProvider.show();
      vscode.commands.executeCommand('open-antigravity.openChat');
    }),
  );

  // Generate Tests command
  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.generateTests', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const text = editor.document.getText(editor.selection.isEmpty ? undefined : editor.selection);
      const filePath = vscode.workspace.asRelativePath(editor.document.uri);
      const prompt = `Generate comprehensive unit tests for this code (file: ${filePath}):\n\`\`\`${editor.document.languageId}\n${text.slice(0, 5000)}\n\`\`\`\n\nWrite the tests in the appropriate test framework for the language.`;

      chatProvider.show();
      vscode.commands.executeCommand('open-antigravity.openChat');
    }),
  );

  // Status bar
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = '$(hubot) Open-Antigravity';
  statusBar.tooltip = 'Click to open Antigravity Chat';
  statusBar.command = 'open-antigravity.openChat';
  statusBar.show();
  context.subscriptions.push(statusBar);

  vscode.window.showInformationMessage('Open Antigravity is ready. Press Ctrl+L to open chat.');
}

export function deactivate(): void {
  // Clean up
}
