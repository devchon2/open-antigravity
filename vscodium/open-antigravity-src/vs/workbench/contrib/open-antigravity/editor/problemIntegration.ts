/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Problem Integration
 *  "Explain and fix" on hover + "Send all to Agent" from Problems panel.
 *  Like Antigravity's problem interaction features.
 *--------------------------------------------------------------------------------------------*/

import { IMarkerService, MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';

export class ProblemIntegration {
  constructor(
    @IMarkerService private readonly markerService: IMarkerService,
    @IEditorService private readonly editorService: IEditorService,
  ) {}

  /** Get all markers (problems) in the current workspace */
  getAllProblems(): Array<{
    message: string; severity: string; file: string; line: number; column: number;
  }> {
    const markers = this.markerService.read();
    return markers.map((m) => ({
      message: m.message,
      severity: m.severity === MarkerSeverity.Error ? 'error' : m.severity === MarkerSeverity.Warning ? 'warning' : 'info',
      file: m.resource.fsPath,
      line: m.startLineNumber,
      column: m.startColumn,
    }));
  }

  /** Build a prompt to send all problems to the agent */
  buildSendAllPrompt(): string {
    const problems = this.getAllProblems();
    if (problems.length === 0) return '';

    const grouped: Record<string, typeof problems> = {};
    for (const p of problems) {
      if (!grouped[p.file]) grouped[p.file] = [];
      grouped[p.file].push(p);
    }

    let prompt = 'Fix all the following problems in the workspace:\n\n';
    for (const [file, issues] of Object.entries(grouped)) {
      prompt += `### ${file}\n`;
      for (const issue of issues.slice(0, 10)) {
        prompt += `- [${issue.severity}] Line ${issue.line}: ${issue.message}\n`;
      }
      prompt += '\n';
    }
    return prompt;
  }

  /** Build a prompt to explain a specific problem */
  buildExplainPrompt(problem: { message: string; file: string; line: number }): string {
    return `Explain and fix this problem in ${problem.file} at line ${problem.line}:\n${problem.message}`;
  }

  /** Trigger the agent to fix all workspace problems */
  async fixAll(): Promise<void> {
    const prompt = this.buildSendAllPrompt();
    if (!prompt) return;

    // Send to agent via gateway
    try {
      await fetch('http://localhost:4001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer open-antigravity-dev-key' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });
    } catch {}
  }
}
