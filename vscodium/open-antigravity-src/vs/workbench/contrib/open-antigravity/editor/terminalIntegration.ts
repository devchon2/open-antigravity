/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Terminal Integration
 *  "Send terminal output to agent" — select terminal text + Cmd+L.
 *  Like Antigravity's terminal → agent integration.
 *--------------------------------------------------------------------------------------------*/

import { ITerminalService } from '../../../../services/terminal/common/terminal.js';

export class TerminalIntegration {
  constructor(@ITerminalService private readonly terminalService: ITerminalService) {}

  /** Get the selection from the active terminal */
  getTerminalSelection(): string {
    try {
      const terminal = this.terminalService.activeInstance;
      if (!terminal) return '';

      // Get selection via the terminal's xterm instance
      const xterm = (terminal as any)?._xterm;
      if (xterm) {
        return xterm.getSelection() || '';
      }
    } catch {}
    return '';
  }

  /** Get recent terminal output (last N lines) */
  getRecentOutput(lines: number = 50): string {
    try {
      const terminal = this.terminalService.activeInstance;
      if (!terminal) return '';

      const xterm = (terminal as any)?._xterm;
      if (xterm) {
        const buffer = xterm.buffer.active;
        const totalLines = buffer.length;
        const startLine = Math.max(0, totalLines - lines);
        let output = '';
        for (let i = startLine; i < totalLines; i++) {
          const line = buffer.getLine(i);
          if (line) output += line.translateToString() + '\n';
        }
        return output;
      }
    } catch {}
    return '';
  }

  /** Build a prompt with terminal context */
  buildTerminalPrompt(selection?: string): string {
    const text = selection || this.getTerminalSelection();
    if (!text) return this.getRecentOutput(100); // Fallback to recent output

    return `Terminal output:\n\`\`\`\n${text.slice(0, 5000)}\n\`\`\``;
  }

  /** Trigger the agent with terminal context */
  async sendToAgent(): Promise<string> {
    const prompt = this.buildTerminalPrompt();
    if (!prompt.trim()) return '';

    try {
      const resp = await fetch('http://localhost:4001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer open-antigravity-dev-key' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: `Analyze this terminal output:\n${prompt}` }],
          stream: false,
        }),
      });
      if (!resp.ok) return '';
      const data = await resp.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch {
      return '';
    }
  }
}
