const { readFileSync, writeFileSync, mkdirSync, readdirSync } = require('fs');
const { join, dirname, isAbsolute } = require('path');
const { exec } = require('child_process');

function resolvePath(p: string): string {
  return isAbsolute(p) ? p : join(process.cwd(), p);
}

export const TOOLS = [
  { function: { name: 'read_file', description: 'Read file contents.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { function: { name: 'write_file', description: 'Write content to file.', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } } },
  { function: { name: 'edit_file', description: 'Replace exact string in file.', parameters: { type: 'object', properties: { path: { type: 'string' }, old_string: { type: 'string' }, new_string: { type: 'string' } }, required: ['path', 'old_string', 'new_string'] } } },
  { function: { name: 'list_directory', description: 'List directory contents.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: [] } } },
  { function: { name: 'execute_command', description: 'Execute shell command.', parameters: { type: 'object', properties: { command: { type: 'string' }, cwd: { type: 'string' } }, required: ['command'] } } },
  { function: { name: 'search_codebase', description: 'Search workspace with regex.', parameters: { type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' } }, required: ['pattern'] } } },
  { function: { name: 'browser_action', description: 'Interact with web browser.', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['navigate', 'click', 'type', 'screenshot', 'get_content'] }, url: { type: 'string' }, selector: { type: 'string' }, text: { type: 'string' } }, required: ['action'] } } },
];

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content?: string; error?: string }> {
  try {
    switch (name) {
      case 'read_file':
        return { content: readFileSync(resolvePath(args.path as string), 'utf-8') };

      case 'write_file': {
        const fp = resolvePath(args.path as string);
        mkdirSync(dirname(fp), { recursive: true });
        writeFileSync(fp, args.content as string, 'utf-8');
        return { content: 'Written: ' + fp };
      }

      case 'edit_file': {
        const fp = resolvePath(args.path as string);
        const orig = readFileSync(fp, 'utf-8');
        const count = orig.split(args.old_string as string).length - 1;
        if (count === 0) return { error: 'old_string not found' };
        if (count > 1) return { error: 'Found ' + count + ' matches — must be unique' };
        writeFileSync(fp, orig.replace(args.old_string as string, args.new_string as string), 'utf-8');
        return { content: 'Edited: ' + fp };
      }

      case 'list_directory': {
        const dp = args.path ? resolvePath(args.path as string) : process.cwd();
        return {
          content: readdirSync(dp, { withFileTypes: true })
            .map((e: any) => (e.isDirectory() ? e.name + '/' : e.name))
            .join('\n'),
        };
      }

      case 'execute_command':
        return new Promise((resolve) =>
          exec(
            args.command as string,
            { cwd: args.cwd as string, timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
            (e: any, stdout: string, stderr: string) =>
              resolve({ content: stdout || stderr || '(empty)', error: e?.message }),
          ),
        );

      case 'search_codebase':
        return new Promise((resolve) => {
          const dir = args.path ? resolvePath(args.path as string) : process.cwd();
          const cmd =
            process.platform === 'win32'
              ? 'findstr /s /i /n "' + args.pattern + '" "' + dir + '\\*" 2>nul'
              : 'grep -rn "' + args.pattern + '" "' + dir + '" 2>/dev/null';
          exec(
            cmd,
            { timeout: 15000, maxBuffer: 5 * 1024 * 1024, shell: true },
            (_e: any, stdout: string) => resolve({ content: stdout || 'No matches' }),
          );
        });

      case 'browser_action':
        try {
          const mod = require('../browser/BrowserAgent.js');
          return { content: await new mod.BrowserAgent().execute(args as any) };
        } catch (e: any) {
          return { error: 'Browser unavailable: ' + e.message };
        }

      default:
        return { error: 'Unknown tool: ' + name };
    }
  } catch (e: any) {
    return { error: e.message };
  }
}
