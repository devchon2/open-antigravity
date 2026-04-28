import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ToolDefinition {
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolResult {
  content: string;
  error?: string;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    function: {
      name: 'read_file',
      description: 'Read the contents of a file.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'File path.' } },
        required: ['path'],
      },
    },
  },
  {
    function: {
      name: 'write_file',
      description: 'Write content to a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path.' },
          content: { type: 'string', description: 'Content.' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    function: {
      name: 'list_directory',
      description: 'List directory contents.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Directory path.' } },
        required: [],
      },
    },
  },
  {
    function: {
      name: 'execute_command',
      description: 'Execute a shell command.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command.' },
          cwd: { type: 'string', description: 'Working directory.' },
        },
        required: ['command'],
      },
    },
  },
  {
    function: {
      name: 'search_codebase',
      description: 'Search workspace files.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern.' },
          path: { type: 'string', description: 'Directory.' },
        },
        required: ['pattern'],
      },
    },
  },
];

function resolvePath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) return inputPath;
  const ws = vscode.workspace.workspaceFolders?.[0];
  return ws ? path.join(ws.uri.fsPath, inputPath) : inputPath;
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  try {
    switch (name) {
      case 'read_file': {
        const fp = resolvePath(args.path as string);
        const content = fs.readFileSync(fp, 'utf-8');
        return { content };
      }
      case 'write_file': {
        const fp = resolvePath(args.path as string);
        fs.mkdirSync(path.dirname(fp), { recursive: true });
        fs.writeFileSync(fp, args.content as string, 'utf-8');
        return { content: 'File written: ' + fp };
      }
      case 'list_directory': {
        const dp = args.path ? resolvePath(args.path as string) : (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '.');
        const entries = fs.readdirSync(dp, { withFileTypes: true });
        return { content: entries.map((e) => (e.isDirectory() ? e.name + '/' : e.name)).join('\n') };
      }
      case 'execute_command': {
        const cwd = args.cwd ? resolvePath(args.cwd as string) : undefined;
        return new Promise((resolve) => {
          cp.exec(args.command as string, { cwd, maxBuffer: 10 * 1024 * 1024, timeout: 30000 }, (_err, stdout, stderr) => {
            resolve({ content: stdout || stderr || '(empty)', error: _err?.message });
          });
        });
      }
      case 'search_codebase': {
        const dir = args.path ? resolvePath(args.path as string) : (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '.');
        return new Promise((resolve) => {
          cp.exec('grep -rn ' + JSON.stringify(args.pattern) + ' ' + JSON.stringify(dir), { timeout: 10000 }, (_err, stdout) => {
            resolve({ content: stdout || 'No matches' });
          });
        });
      }
      default:
        return { content: '', error: 'Unknown tool: ' + name };
    }
  } catch (err: unknown) {
    return { content: '', error: err instanceof Error ? err.message : String(err) };
  }
}
