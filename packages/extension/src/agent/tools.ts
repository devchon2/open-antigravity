import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface ToolResult {
  toolCallId: string;
  content: string;
  error?: string;
}

export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to workspace root' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file, creating it if needed',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to workspace root' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_file',
      description: 'Find and replace text in a file using exact string match',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to workspace root' },
          old_string: { type: 'string', description: 'Exact string to find' },
          new_string: { type: 'string', description: 'Replacement string' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'execute_command',
      description: 'Execute a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
          cwd: { type: 'string', description: 'Working directory' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_codebase',
      description: 'Search for a regex pattern in workspace files',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search for' },
          path: { type: 'string', description: 'Directory to search in (defaults to workspace root)' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_directory',
      description: 'List files and folders in a directory',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path (defaults to workspace root)' },
        },
        required: [],
      },
    },
  },
];

function workspaceRoot(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || !folders.length) return process.cwd();
  return folders[0].uri.fsPath;
}

function resolvePath(p: string): string {
  if (path.isAbsolute(p)) return p;
  return path.join(workspaceRoot(), p);
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  try {
    switch (name) {
      case 'read_file': {
        const filePath = resolvePath(args.path as string);
        const content = fs.readFileSync(filePath, 'utf8');
        return { toolCallId: '', content: `File: ${filePath}\n\`\`\`\n${content.slice(0, 50000)}\n\`\`\`${content.length > 50000 ? '\n... (truncated)' : ''}` };
      }
      case 'write_file': {
        const filePath = resolvePath(args.path as string);
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, args.content as string, 'utf8');
        return { toolCallId: '', content: `File written: ${filePath}` };
      }
      case 'edit_file': {
        const filePath = resolvePath(args.path as string);
        const original = fs.readFileSync(filePath, 'utf8');
        const oldStr = args.old_string as string;
        if (!original.includes(oldStr)) {
          return { toolCallId: '', error: 'old_string not found in file. Make sure to match exactly including whitespace.', content: '' };
        }
        const updated = original.replace(oldStr, args.new_string as string);
        fs.writeFileSync(filePath, updated, 'utf8');
        return { toolCallId: '', content: `Applied edit to ${filePath}. Lines changed.` };
      }
      case 'execute_command': {
        const { execSync } = require('child_process');
        const cwd = args.cwd ? resolvePath(args.cwd as string) : workspaceRoot();
        const output = execSync(args.command as string, { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
        return { toolCallId: '', content: output || '(no output)' };
      }
      case 'search_codebase': {
        const { execSync } = require('child_process');
        const cwd = args.path ? resolvePath(args.path as string) : workspaceRoot();
        const output = execSync(`rg --no-heading -n "${args.pattern}" "${cwd}"`, { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
        return { toolCallId: '', content: output.slice(0, 50000) || 'No matches found' };
      }
      case 'list_directory': {
        const dirPath = args.path ? resolvePath(args.path as string) : workspaceRoot();
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        const listing = entries.map((e) => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
        return { toolCallId: '', content: `Directory: ${dirPath}\n${listing}` };
      }
      default:
        return { toolCallId: '', error: `Unknown tool: ${name}`, content: '' };
    }
  } catch (err: unknown) {
    return {
      toolCallId: '',
      error: err instanceof Error ? err.message : String(err),
      content: '',
    };
  }
}
