import { exec } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname, isAbsolute } from 'path';

export interface ToolResult { content: string; error?: string; }

export const ANTIGRAVITY_TOOLS = [
  'read_file', 'write_file', 'edit_file', 'list_directory',
  'execute_command', 'search_codebase', 'browser_action',
];

function resolve(inputPath: string, wsRoot: string): string {
  return isAbsolute(inputPath) ? inputPath : join(wsRoot, inputPath);
}

export async function executeTool(
  name: string, args: Record<string, unknown>, wsRoot: string
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'read_file': {
        const fp = resolve(args.path as string, wsRoot);
        return { content: readFileSync(fp, 'utf-8') };
      }
      case 'write_file': {
        const fp = resolve(args.path as string, wsRoot);
        mkdirSync(dirname(fp), { recursive: true });
        writeFileSync(fp, (args.content as string) || '', 'utf-8');
        return { content: `Written: ${fp}` };
      }
      case 'edit_file': {
        const fp = resolve(args.path as string, wsRoot);
        const orig = readFileSync(fp, 'utf-8');
        const count = orig.split(args.old_string as string).length - 1;
        if (count === 0) return { error: 'String not found', content: '' };
        if (count > 1) return { error: `Found ${count} times`, content: '' };
        writeFileSync(fp, orig.replace(args.old_string as string, args.new_string as string), 'utf-8');
        return { content: '1 replacement' };
      }
      case 'list_directory': {
        const dp = args.path ? resolve(args.path as string, wsRoot) : wsRoot;
        const entries = readdirSync(dp, { withFileTypes: true });
        return { content: entries.map(e => e.isDirectory() ? e.name + '/' : e.name).join('\n') };
      }
      case 'execute_command':
        return new Promise(resolve => {
          exec(args.command as string, { timeout: 30000, maxBuffer: 10485760 }, (_err, stdout, stderr) =>
            resolve({ content: stdout || stderr || '(empty)', error: _err?.message }));
        });
      case 'search_codebase': {
        const dir = args.path ? resolve(args.path as string, wsRoot) : wsRoot;
        const pattern = args.pattern as string;
        const cmd = process.platform === 'win32'
          ? `findstr /s /i /n /r "${pattern}" "${dir}\\*" 2>nul`
          : `grep -rn "${pattern}" "${dir}" 2>/dev/null`;
        return new Promise(resolve => {
          exec(cmd, { timeout: 15000, shell: true }, (_err, stdout) => resolve({ content: stdout || 'No matches' }));
        });
      }
      case 'browser_action':
        return { error: 'Install Playwright', content: '' };
      default:
        return { error: `Unknown: ${name}`, content: '' };
    }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err), content: '' };
  }
}
