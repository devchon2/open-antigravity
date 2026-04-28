import { useCallback } from "react";

interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

let api: VSCodeAPI | null = null;

export function useVSCodeAPI(): VSCodeAPI {
  if (!api) {
    try {
      api = acquireVsCodeApi();
    } catch {
      api = {
        postMessage: (msg) => console.log("vscode.postMessage:", msg),
        getState: () => ({}),
        setState: () => {},
      };
    }
  }
  return api!;
}
