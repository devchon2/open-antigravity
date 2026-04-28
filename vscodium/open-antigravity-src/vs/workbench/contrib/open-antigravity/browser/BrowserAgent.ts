/*---------------------------------------------------------------------------------------------
 *  Open-Browser Agent — Playwright Subagent
 *  Navigate, click, type, screenshot. Injects blue border (UX).
 *--------------------------------------------------------------------------------------------*/

interface BrowserAction {
  action: 'navigate' | 'click' | 'type' | 'scroll' | 'screenshot' | 'get_content';
  url?: string; selector?: string; text?: string; amount?: number;
}

export class BrowserAgent {
  private browserProcess: any = null;
  private isActive = false;

  async execute(action: BrowserAction): Promise<string> {
    if (!this.isActive) await this.start();

    const context = await this.browserProcess.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    // Blue border = agent control (matching UX)
    await page.addStyleTag({
      content: 'body { border: 3px solid #58a6ff !important; box-shadow: 0 0 20px rgba(88,166,255,0.3) !important; }',
    });

    try {
      switch (action.action) {
        case 'navigate':
          if (action.url) { await page.goto(action.url, { waitUntil: 'domcontentloaded' }); return `Navigated to ${action.url}`; }
          return 'No URL provided';
        case 'click':
          if (action.selector) { await page.click(action.selector); return `Clicked ${action.selector}`; }
          return 'No selector';
        case 'type':
          if (action.selector && action.text) { await page.fill(action.selector, action.text); return `Typed into ${action.selector}`; }
          return 'Missing selector or text';
        case 'scroll':
          await page.evaluate((a: number) => window.scrollBy(0, a || 300), action.amount || 300);
          return 'Scrolled';
        case 'screenshot': {
          const buf = await page.screenshot({ type: 'png', fullPage: true });
          return `[screenshot]${buf.toString('base64')}`;
        }
        case 'get_content': {
          const text = await page.evaluate(() => document.body.innerText);
          return text.slice(0, 5000);
        }
        default: return `Unknown action: ${action.action}`;
      }
    } finally {
      await page.waitForTimeout(300);
      await context.close();
    }
  }

  private async start(): Promise<void> {
    try {
      const { chromium } = await import('playwright');
      this.browserProcess = await chromium.launch({ headless: false });
      this.isActive = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Browser agent failed: ${msg}. Install: npm i playwright && npx playwright install chromium`);
    }
  }

  async stop(): Promise<void> {
    if (this.browserProcess) { await this.browserProcess.close(); this.browserProcess = null; this.isActive = false; }
  }
}
