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
      description: 'Read the contents of a file at the given path.',
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
      description: 'Write content to a file, creating it if it does not exist.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path.' },
          content: { type: 'string', description: 'Content to write.' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    function: {
      name: 'edit_file',
      description: 'Replace a specific string in a file using exact match (like sed).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path.' },
          old_string: { type: 'string', description: 'Exact string to find and replace.' },
          new_string: { type: 'string', description: 'String to replace it with.' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    function: {
      name: 'list_directory',
      description: 'List files and directories at the given path.',
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
      description: 'Execute a shell command and return its output.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command.' },
          cwd: { type: 'string', description: 'Working directory.' },
        },
        required: ['command'],
      },
    },
  },
  {
    function: {
      name: 'search_codebase',
      description: 'Search for a regex pattern in workspace files.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search.' },
          path: { type: 'string', description: 'Directory to search.' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    function: {
      name: 'browser_action',
      description: 'Interact with a web browser (navigate, click, type, screenshot). Requires the browser agent.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['navigate', 'click', 'type', 'screenshot', 'get_content'], description: 'Action type.' },
          url: { type: 'string', description: 'URL (for navigate).' },
          selector: { type: 'string', description: 'CSS selector (for click/type).' },
          text: { type: 'string', description: 'Text to type.' },
        },
        required: ['action'],
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
      case 'edit_file': {
        const fp = resolvePath(args.path as string);
        const original = fs.readFileSync(fp, 'utf-8');
        const count = original.split(args.old_string as string).length - 1;
        if (count === 0) return { content: '', error: 'old_string not found in file' };
        if (count > 1) return { content: '', error: `old_string found ${count} times — must be unique` };
        const modified = original.replace(args.old_string as string, args.new_string as string);
        fs.writeFileSync(fp, modified, 'utf-8');
        return { content: `Edited ${fp}: 1 replacement` };
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
        const pattern = args.pattern as string;
        const isWindows = process.platform === 'win32';
        const cmd = isWindows
          ? `findstr /s /i /n /r "${pattern}" "${dir}\\*" 2>nul`
          : `grep -rn "${pattern}" "${dir}" 2>/dev/null`;
        return new Promise((resolve) => {
          cp.exec(cmd, { timeout: 15000, maxBuffer: 5 * 1024 * 1024, shell: true }, (_err, stdout) => {
            resolve({ content: stdout || 'No matches' });
          });
        });
      }
      case 'browser_action': {
        // Delegate to the browser agent (imported dynamically to avoid hard dep)
        try {
          const { browserAgent } = await import('./BrowserAgent.js');
          const result = await browserAgent.execute(args as any, 'browser-agent');
          return { content: result };
        } catch (err: unknown) {
          return { content: '', error: 'Browser agent unavailable: ' + (err instanceof Error ? err.message : String(err)) };
        }
      }
      default:
        return { content: '', error: 'Unknown tool: ' + name };
    }
  } catch (err: unknown) {
    return { content: '', error: err instanceof Error ? err.message : String(err) };
  }
}
