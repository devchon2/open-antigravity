/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity MCP Client
 *  Model Context Protocol integration — local and remote MCP servers.
 *  Config: $HOME/.open-antigravity/mcp_config.json
 *--------------------------------------------------------------------------------------------*/

export interface MCPServerConfig {
  name: string;
  command?: string;      // Local MCP: shell command to start the server
  args?: string[];       // Local MCP: arguments
  serverUrl?: string;    // Remote MCP: HTTP endpoint
  headers?: Record<string, string>; // Remote MCP: auth headers
  enabled: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  serverName: string;
}

export class MCPClient {
  private servers: Map<string, MCPServerConfig> = new Map();
  private tools: MCPTool[] = [];
  private disabledTools: Set<string> = new Set();

  /** Scan for MCP config and load servers */
  async scan(): Promise<void> {
    try {
      const { existsSync, readFileSync } = require('fs');
      const { join } = require('path');
      const { homedir } = require('os');
      const configPath = join(homedir(), '.open-antigravity', 'mcp_config.json');

      if (!existsSync(configPath)) return;

      const raw = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);

      if (config.mcpServers) {
        for (const [name, server] of Object.entries(config.mcpServers)) {
          const s = server as any;
          this.servers.set(name, {
            name,
            command: s.command,
            args: s.args,
            serverUrl: s.serverUrl,
            headers: s.headers,
            enabled: s.enabled !== false,
          });
        }
      }

      if (config.disabledTools) {
        for (const t of config.disabledTools) {
          this.disabledTools.add(t as string);
        }
      }
    } catch {}
  }

  /** Get list of available MCP tools (for the agent's system prompt) */
  getTools(): MCPTool[] {
    return this.tools.filter((t) => !this.disabledTools.has(`${t.serverName}.${t.name}`));
  }

  /** Discover tools from an MCP server */
  async discoverTools(serverName: string): Promise<MCPTool[]> {
    const server = this.servers.get(serverName);
    if (!server || !server.enabled) return [];

    try {
      // Local MCP: spawn the server process
      if (server.command) {
        const { spawn } = require('child_process');
        const proc = spawn(server.command, server.args || []);
        // Send tools/list request
        proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'tools/list', id: 1 }) + '\n');
        proc.stdin.end();

        const result = await new Promise<string>((resolve) => {
          let output = '';
          proc.stdout.on('data', (d: Buffer) => { output += d.toString(); });
          proc.on('close', () => resolve(output));
          setTimeout(() => resolve(output), 5000);
        });

        const parsed = JSON.parse(result);
        if (parsed.result?.tools) {
          return parsed.result.tools.map((t: any) => ({
            name: t.name, description: t.description || '', parameters: t.inputSchema || {},
            serverName,
          }));
        }
      }
    } catch {}

    return [];
  }

  /** Toggle a specific tool */
  toggleTool(serverName: string, toolName: string, enabled: boolean): void {
    const key = `${serverName}.${toolName}`;
    if (enabled) this.disabledTools.delete(key);
    else this.disabledTools.add(key);
  }

  /** Get enabled servers */
  getEnabledServers(): MCPServerConfig[] {
    return Array.from(this.servers.values()).filter((s) => s.enabled);
  }

  /** Save config (disabled tools) */
  async save(): Promise<void> {
    try {
      const { writeFileSync, mkdirSync } = require('fs');
      const { join } = require('path');
      const { homedir } = require('os');
      const dir = join(homedir(), '.open-antigravity');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'mcp_config.json'), JSON.stringify({
        mcpServers: Object.fromEntries(this.servers),
        disabledTools: Array.from(this.disabledTools),
      }, null, 2), 'utf-8');
    } catch {}
  }
}
