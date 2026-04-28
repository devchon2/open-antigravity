import * as vscode from 'vscode';
import { streamChat } from '../services/gateway.js';
import { executeTool, TOOL_DEFINITIONS } from './tools.js';
import { SYSTEM_PROMPT, PLANNING_MODE_PROMPT, FAST_MODE_PROMPT } from '@open-antigravity/shared';
import { diffManager } from '../diffs/DiffManager.js';
import { approvalManager } from '../approval/ApprovalManager.js';
import { checkpointManager } from '../workspace/CheckpointManager.js';
import { artifactStore } from '../artifacts/ArtifactStore.js';
import { skillLoader } from './SkillLoader.js';
import { workflowLoader } from './WorkflowLoader.js';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export class AgentEngine {
  private messages: AgentMessage[] = [];
  private model: string;
  private runId: string = '';

  constructor(model: string) {
    this.model = model;
  }

  reset(): void {
    this.messages = [];
    this.runId = '';
    diffManager.clear();
    checkpointManager.clear();
  }

  getConversation(): AgentMessage[] {
    return [...this.messages];
  }

  async *run(initialMessage: string, mode: 'fast' | 'planning' = 'fast'): AsyncIterable<string> {
    let userMessage = initialMessage;
    const config = vscode.workspace.getConfiguration('open-antigravity');
    this.model = config.get<string>('defaultModel', 'gpt-4o');
    this.runId = crypto.randomUUID();

    // Configure approval based on mode
    const approvalMode = config.get<string>('approvalMode', 'always');
    approvalManager.setAutoApprove(mode === 'fast' && approvalMode === 'never');

    let systemPrompt = SYSTEM_PROMPT;
    if (mode === 'planning') {
      systemPrompt += '\n\n' + PLANNING_MODE_PROMPT;
    } else {
      systemPrompt += '\n\n' + FAST_MODE_PROMPT;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length) {
      systemPrompt += `\n\n## Current Workspace\nRoot: ${workspaceFolders[0].uri.fsPath}`;
      systemPrompt += `\n\n## Available Tools\n${TOOL_DEFINITIONS.map((t) => `- ${t.function.name}: ${t.function.description}`).join('\n')}`;
    }

    // Check for matching skills (progressive disclosure)
    const matchingSkills = skillLoader.findMatchingSkills(userMessage);
    if (matchingSkills.length > 0) {
      for (const skill of matchingSkills) {
        skillLoader.loadSkill(skill.name);
      }
      const skillInstructions = skillLoader.getLoadedInstructions();
      if (skillInstructions) {
        systemPrompt += `\n\n## Active Skills\n${skillInstructions}`;
      }
    }

    // Check for /workflow commands in the message
    const workflowMatch = userMessage.match(/^\/(\S+)/);
    if (workflowMatch) {
      const workflow = workflowLoader.matchCommand(workflowMatch[1]);
      if (workflow) {
        userMessage = `${workflow.prompt}\n\n---\n${userMessage}`;
      }
    }

    this.messages.push({ role: 'user', content: userMessage });

    // Create task list artifact in planning mode
    if (mode === 'planning') {
      artifactStore.create(this.runId, 'plan', 'Implementation Plan', userMessage, 'pending');
      yield '\n📋 **Plan created.** Review in Artifacts panel.\n';
    }

    // Create checkpoint before execution
    await checkpointManager.create(`before: ${userMessage.slice(0, 50)}`);

    const gatewayMessages = this.messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.toolCalls ? { tool_calls: m.toolCalls.map((tc) => ({
        id: tc.id,
        type: tc.type,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })) } : {}),
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
    }));

    let fullResponse = '';
    let toolIteration = 0;
    const MAX_TOOL_ITERATIONS = 10;

    for await (const chunk of streamChat(this.model, gatewayMessages as any[], systemPrompt)) {
      if (chunk.type === 'text' && chunk.content) {
        fullResponse += chunk.content;
        yield chunk.content;
      }

      if (chunk.type === 'tool_call' && chunk.toolCall) {
        if (++toolIteration > MAX_TOOL_ITERATIONS) {
          yield '\n\n⚠️ Max tool iterations reached.\n';
          break;
        }

        const tc = chunk.toolCall as {
          id: string;
          type: 'function';
          function: { name: string; arguments: string };
        };

        yield `\n\n🔧 **Executing:** \`${tc.function.name}\`\n`;

        // Request approval for write/execute/browser operations
        const needsApproval = ['write_file', 'edit_file', 'execute_command', 'browser_action'].includes(tc.function.name);
        let approved = !needsApproval;

        if (needsApproval) {
          const args = JSON.parse(tc.function.arguments);
          const desc = tc.function.name === 'execute_command'
            ? `Command: ${args.command}`
            : tc.function.name === 'browser_action'
            ? `Browser: ${args.action || 'navigate'} ${args.url || ''}`
            : `Write to: ${args.path}`;

          // Use VS Code QuickPick for approval (synchronous UI)
          const choice = await vscode.window.showQuickPick(
            ['Approve', 'Reject', 'Approve all'],
            { placeHolder: `Agent wants to ${tc.function.name}: ${desc}`, ignoreFocusOut: true },
          );
          approved = choice === 'Approve' || choice === 'Approve all';
          if (choice === 'Approve all') {
            approvalManager.setAutoApprove(true);
            approved = true;
          }
        }

        const args = JSON.parse(tc.function.arguments);
        const result = await executeTool(tc.function.name, args);

        this.messages.push({
          role: 'assistant',
          content: null,
          toolCalls: [tc],
        });
        this.messages.push({
          role: 'tool',
          toolCallId: tc.id,
          content: result.error || result.content,
        });

        if (result.error) {
          yield `\n⚠️ **Error:** ${result.error}\n`;
        } else {
          yield `\n✅ **Done**\n`;
        }

        // Show diff for file writes + create artifact
        if (['write_file', 'edit_file'].includes(tc.function.name) && !result.error) {
          const filePath = args.path as string;
          const newContent = args.content || (args.new_string as string) || '';
          const originalContent = tc.function.name === 'edit_file' ? '' : ''; // TODO: read original
          const diff = diffManager.generateDiff(filePath, originalContent, newContent);
          yield `\n\`\`\`diff\n${diff}\n\`\`\`\n`;
          artifactStore.create(this.runId, 'diff', `Changes to ${filePath}`, diff, 'completed');
        }

        // Recurse: send tool result back to model, handling further tool calls
        const mapMessages = () => this.messages.map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.toolCalls ? { tool_calls: m.toolCalls.map((t) => ({
            id: t.id, type: t.type,
            function: { name: t.function.name, arguments: t.function.arguments },
          })) } : {}),
          ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
        }));

        let recurseAgain = true;
        let recurseIter = 0;
        let msgs = mapMessages();

        while (recurseAgain && recurseIter < 3) {
          recurseAgain = false;
          recurseIter++;
          for await (const fChunk of streamChat(this.model, msgs as any[], systemPrompt)) {
            if (fChunk.type === 'text' && fChunk.content) {
              fullResponse += fChunk.content;
              yield fChunk.content;
            }
            if (fChunk.type === 'tool_call' && fChunk.toolCall) {
              const fTc = fChunk.toolCall as { id: string; type: 'function'; function: { name: string; arguments: string } };
              if (++toolIteration > MAX_TOOL_ITERATIONS) { yield '\n⚠️ Max iterations\n'; break; }
              yield `\n🔧 **Executing:** \`${fTc.function.name}\`\n`;

              const fArgs = JSON.parse(fTc.function.arguments);
              const fResult = await executeTool(fTc.function.name, fArgs);
              this.messages.push({ role: 'assistant', content: null, toolCalls: [fTc] });
              this.messages.push({ role: 'tool', toolCallId: fTc.id, content: fResult.error || fResult.content });
              yield fResult.error ? `\n⚠️ ${fResult.error}\n` : `\n✅ Done\n`;
              msgs = mapMessages();
              recurseAgain = true;
              break; // break out of inner loop, restart with updated messages
            }
          }
        }
      }

      if (chunk.type === 'error') {
        yield `\n❌ **Error:** ${chunk.content}\n`;
      }
    }

    if (fullResponse) {
      this.messages.push({ role: 'assistant', content: fullResponse });
    }

    // Create walkthrough artifact summarizing the work
    const diffs = artifactStore.getByType('diff');
    if (diffs.length > 0 || fullResponse) {
      artifactStore.create(
        this.runId,
        'walkthrough',
        'Session Summary',
        `### Task\n${userMessage.slice(0, 200)}\n\n### Changes\n${diffs.map((d) => `- ${d.title}`).join('\n')}\n\n### Result\n${fullResponse.slice(0, 500)}`,
        'completed',
      );
    }

    // Persist artifacts
    await artifactStore.save();

    yield '[DONE]';
  }
}
