import * as vscode from 'vscode';
import { artifactStore } from '../artifacts/ArtifactStore.js';
import { approvalManager } from '../approval/ApprovalManager.js';

export interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'screenshot' | 'get_content';
  url?: string;
  selector?: string;
  text?: string;
  amount?: number;
}

export class BrowserAgent {
  private browserProcess: any = null;
  private isActive = false;

  /** Check if Playwright is available */
  static isAvailable(): boolean {
    try {
      require.resolve('playwright');
      return true;
    } catch {
      return false;
    }
  }

  /** Start the browser subagent */
  async start(): Promise<void> {
    if (this.isActive) return;

    const approved = await approvalManager.requestApproval(
      'browser_action',
      'Browser Agent',
      'The agent wants to start a browser session for web interaction.',
    );

    if (!approved) throw new Error('Browser agent start rejected');

    try {
      const { chromium } = await import('playwright');
      this.browserProcess = await chromium.launch({ headless: false });
      this.isActive = true;
      vscode.window.showInformationMessage('Browser Agent started (blue border = agent control)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Browser agent failed: ${msg}. Install: npm i playwright && npx playwright install chromium`);
    }
  }

  /** Execute a browser action */
  async execute(action: BrowserAction, agentId: string): Promise<string> {
    if (!this.isActive) await this.start();

    const context = await this.browserProcess.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    // Inject blue border to indicate agent control (Antigravity UX)
    await page.addStyleTag({
      content: 'body { border: 3px solid #58a6ff !important; box-shadow: 0 0 20px rgba(88,166,255,0.3) !important; }',
    });

    try {
      let result = '';

      switch (action.type) {
        case 'navigate':
          if (action.url) {
            await page.goto(action.url, { waitUntil: 'domcontentloaded' });
            result = `Navigated to ${action.url}`;
          }
          break;

        case 'click':
          if (action.selector) {
            await page.click(action.selector);
            result = `Clicked ${action.selector}`;
          }
          break;

        case 'type':
          if (action.selector && action.text) {
            await page.fill(action.selector, action.text);
            result = `Typed into ${action.selector}`;
          }
          break;

        case 'scroll':
          await page.evaluate((amount) => window.scrollBy(0, amount || 300), action.amount || 300);
          result = 'Scrolled';
          break;

        case 'screenshot': {
          const screenshot = await page.screenshot({ type: 'png', fullPage: true });
          const base64 = screenshot.toString('base64');
          artifactStore.create(agentId, 'screenshot', `Screenshot of ${page.url()}`, base64, 'completed');
          result = `Screenshot captured (${page.url()})`;
          break;
        }

        case 'get_content': {
          const content = await page.content();
          const text = await page.evaluate(() => document.body.innerText);
          result = text.slice(0, 5000);
          break;
        }

        default:
          result = `Unknown action: ${action.type}`;
      }

      // Brief pause so user can see the blue border
      await page.waitForTimeout(500);

      return result;
    } finally {
      await context.close();
    }
  }

  /** Take a screenshot of a URL and save as artifact */
  async captureUrl(url: string, agentId: string): Promise<string> {
    return this.execute({ type: 'navigate', url }, agentId);
  }

  /** Stop the browser agent */
  async stop(): Promise<void> {
    if (this.browserProcess) {
      await this.browserProcess.close();
      this.browserProcess = null;
      this.isActive = false;
    }
  }
}

export const browserAgent = new BrowserAgent();
