import * as vscode from 'vscode';
import { ChatPanel } from './panels/ChatPanel.js';

export function activate(context: vscode.ExtensionContext) {
  console.log('Open-Antigravity extension activated');

  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.openChat', () => {
      ChatPanel.createOrShow(context.extensionUri);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.openAgentManager', () => {
      vscode.window.showInformationMessage('Open-Antigravity: Agent Manager coming in next phase');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.explainCode', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const selection = editor.document.getText(editor.selection);
      if (selection) {
        ChatPanel.createOrShow(context.extensionUri);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.sendToAgent', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const selection = editor.document.getText(editor.selection);
      if (selection) {
        ChatPanel.createOrShow(context.extensionUri);
        vscode.window.showInformationMessage(`Selection sent to agent (${selection.length} chars)`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.generateTests', () => {
      ChatPanel.createOrShow(context.extensionUri);
    }),
  );

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.text = '$(hubot) Open-AG';
  statusBar.tooltip = 'Open-Antigravity';
  statusBar.command = 'open-antigravity.openChat';
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function deactivate() {
  console.log('Open-Antigravity extension deactivated');
}
