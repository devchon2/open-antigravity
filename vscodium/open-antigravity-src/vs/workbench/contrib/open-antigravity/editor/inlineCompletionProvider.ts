/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Inline Completion Provider
 *  Tab autocomplete using the LLM Gateway — like Antigravity's Tab / Tab to import / Tab to jump.
 *  Registered as a VS Code InlineCompletionItemProvider.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, InlineCompletionContext, InlineCompletionItem, InlineCompletionItemProvider, InlineCompletionList, Position, ProviderResult, TextDocument } from '../../../../../editor/common/languages.js';

export class AgentInlineCompletionProvider implements InlineCompletionItemProvider {
  constructor(private gatewayUrl: string = 'http://localhost:4001') {}

  async provideInlineCompletionItems(
    document: TextDocument,
    position: Position,
    _context: InlineCompletionContext,
    _token: CancellationToken,
  ): ProviderResult<InlineCompletionItem[] | InlineCompletionList> {
    // Get context: current line + previous 20 lines
    const startLine = Math.max(0, position.line - 20);
    const contextText = document.getText().split('\n').slice(startLine, position.line + 1).join('\n');
    const cursorPos = contextText.length - (position.line < document.lineCount ? document.lineAt(position.line).text.length - position.character : 0);

    const prompt = `Complete the code at the cursor position. Return ONLY the completion text, no explanation.

File: ${document.fileName}
Language: ${document.languageId}
Context before cursor:
\`\`\`${document.languageId}
${contextText.slice(0, cursorPos)}
\`\`\`
Context after cursor:
\`\`\`${document.languageId}
${contextText.slice(cursorPos)}
\`\`\`

Cursor is at █. Provide the code that should appear at this position.`;

    try {
      const resp = await fetch(`${this.gatewayUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer open-antigravity-dev-key' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          max_tokens: 256,
          temperature: 0.2,
        }),
      });

      if (!resp.ok) return [];
      const data = await resp.json() as any;
      const completion = data.choices?.[0]?.message?.content?.trim();

      if (!completion || completion === 'NONE' || completion.includes('no completion')) return [];

      return [new InlineCompletionItem(completion)];
    } catch {
      return [];
    }
  }
}
