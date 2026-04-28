export const DEFAULT_MODELS = [
  { id: 'gpt-4o', provider: 'openai' as const, name: 'GPT-4o', maxTokens: 128000, streaming: true },
  { id: 'gpt-4o-mini', provider: 'openai' as const, name: 'GPT-4o Mini', maxTokens: 128000, streaming: true },
  { id: 'claude-sonnet-4-6', provider: 'anthropic' as const, name: 'Claude Sonnet 4.6', maxTokens: 200000, streaming: true },
  { id: 'claude-opus-4-7', provider: 'anthropic' as const, name: 'Claude Opus 4.7', maxTokens: 200000, streaming: true },
  { id: 'claude-haiku-4-5', provider: 'anthropic' as const, name: 'Claude Haiku 4.5', maxTokens: 200000, streaming: true },
  { id: 'gemini-3-pro', provider: 'google' as const, name: 'Gemini 3 Pro', maxTokens: 1048576, streaming: true },
  { id: 'gemini-3-flash', provider: 'google' as const, name: 'Gemini 3 Flash', maxTokens: 1048576, streaming: true },
];

export const AGENT_MODES = ['planning', 'fast'] as const;

export const ARTIFACT_TYPES = [
  'task_list',
  'plan',
  'diff',
  'screenshot',
  'browser_recording',
  'walkthrough',
] as const;

export const AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file at the given path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or workspace-relative file path.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file, creating it if it does not exist.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or workspace-relative file path.' },
          content: { type: 'string', description: 'Content to write to the file.' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_file',
      description: 'Replace a specific string in a file with new content (exact match).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute or workspace-relative file path.' },
          old_string: { type: 'string', description: 'Exact string to replace.' },
          new_string: { type: 'string', description: 'Content to replace it with.' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'execute_command',
      description: 'Execute a shell command and return the output.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute.' },
          cwd: { type: 'string', description: 'Working directory for the command.' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_codebase',
      description: 'Search for a pattern in the workspace files using ripgrep.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search for.' },
          path: { type: 'string', description: 'Directory to search in (defaults to workspace root).' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_directory',
      description: 'List files and directories at the given path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path to list. Defaults to workspace root.' },
        },
        required: [],
      },
    },
  },
];
