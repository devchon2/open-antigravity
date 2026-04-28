import * as vscode from 'vscode';
import { ChatViewProvider } from './panels/chat.js';
import { skillLoader } from './agent/SkillLoader.js';
import { workflowLoader } from './agent/WorkflowLoader.js';

export function activate(context: vscode.ExtensionContext): void {
  // Scan for skills and workflows at startup
  skillLoader.scan().catch(() => {});
  workflowLoader.scan().catch(() => {});

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

  // Open Agent Manager (Cmd+E toggle)
  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.openAgentManager', () => {
      vscode.commands.executeCommand('workbench.view.extension.open-antigravity-sidebar');
    }),
  );

  // Cmd+I: Inline command from editor
  context.subscriptions.push(
    vscode.commands.registerCommand('open-antigravity.inlineCommand', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const prompt = await vscode.window.showInputBox({
        placeHolder: 'Ask the agent to edit this code... (e.g., "add error handling")',
        prompt: 'Inline Agent Command',
      });
      if (prompt) {
        const selection = editor.selection;
        const code = editor.document.getText(selection.isEmpty ? undefined : selection);
        const lang = editor.document.languageId;
        const fullPrompt = code
          ? `${prompt}\n\nCode:\n\`\`\`${lang}\n${code.slice(0, 3000)}\n\`\`\``
          : prompt;
        chatProvider.sendPrompt(fullPrompt, 'fast');
      }
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
      chatProvider.sendPrompt(prompt, 'fast');
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
      chatProvider.sendPrompt(prompt, 'fast');
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
      chatProvider.sendPrompt(prompt, 'planning');
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
