/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Inline Commands (Cmd+I)
 *  Natural language commands in the editor and terminal.
 *  Like Antigravity's Cmd+I inline editing.
 *--------------------------------------------------------------------------------------------*/

import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../../browser/services/codeEditorService.js';

export class InlineCommandHandler {
  constructor(
    @IEditorService private readonly editorService: IEditorService,
    @ICodeEditorService private readonly codeEditorService: ICodeEditorService,
  ) {}

  /** Trigger Cmd+I — get user's natural language instruction and execute agent */
  async execute(): Promise<void> {
    const editor = this.editorService.activeTextEditorControl;
    if (!editor) return;

    const selection = editor.getSelection();
    const code = selection ? editor.getModel()?.getValueInRange(selection) || '' : '';
    const lang = editor.getModel()?.getLanguageId() || '';

    // TODO: Show inline input box near cursor (like Antigravity) instead of modal
    const { userPrompt } = await this.showInlinePrompt();

    if (!userPrompt) return;

    const fullPrompt = code
      ? `${userPrompt}\n\nCode:\n\`\`\`${lang}\n${code.slice(0, 3000)}\n\`\`\``
      : userPrompt;

    // Send to agent and stream result
    try {
      const resp = await fetch('http://localhost:4001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer open-antigravity-dev-key' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: fullPrompt }],
          stream: true,
        }),
      });

      if (!resp.ok) throw new Error('Gateway error');

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No body');

      let result = '';
      const dec = new TextDecoder();
      let buf = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const l of lines) {
          if (!l.startsWith('data: ')) continue;
          const d = l.slice(6).trim();
          if (!d || d === '[DONE]') continue;
          try {
            const chunk = JSON.parse(d);
            if (chunk.type === 'text' && chunk.content) result += chunk.content;
          } catch {}
        }
      }

      // Insert result at cursor
      if (result && selection) {
        const model = editor.getModel();
        if (model) {
          model.pushEditOperations([], [{ range: selection, text: result }], () => null);
        }
      }
    } catch {
      // Silent fail — user can retry
    }
  }

  /** Show inline prompt dialog near the cursor */
  private async showInlinePrompt(): Promise<{ userPrompt?: string }> {
    return new Promise((resolve) => {
      // Use a VS Code input box as fallback (ideal: inline widget near cursor)
      const quickPick = require('vscode')?.window?.showInputBox;
      if (typeof quickPick === 'function') {
        quickPick({
          placeHolder: 'Ask the agent to edit this code... ("add error handling")',
          prompt: 'Cmd+I: Inline Agent Command',
        }).then((val: string | undefined) => resolve({ userPrompt: val || undefined }));
      } else {
        resolve({ userPrompt: undefined });
      }
    });
  }
}
