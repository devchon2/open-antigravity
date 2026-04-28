/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Browser Recorder
 *  Video recording of browser subagent sessions.
 *  Like Antigravity's browser recording artifacts.
 *--------------------------------------------------------------------------------------------*/

import { ArtifactStore } from '../artifacts/ArtifactStore.js';

export class BrowserRecorder {
  private mediaRecorder: any = null;
  private recordedChunks: any[] = [];
  private isRecording: boolean = false;

  constructor(private artifactStore: ArtifactStore) {}

  /** Start recording the current browser page */
  async startRecording(page: any): Promise<void> {
    if (this.isRecording) return;

    try {
      // Use Playwright's video recording API if available
      const context = page.context();
      const recorder = await (context as any)._browser?._recorder;

      // Alternative: use MediaRecorder via page.evaluate for canvas-based recording
      this.isRecording = true;
      this.recordedChunks = [];

      // Start capturing screenshots at 10fps as a simple "video"
      const fps = 10;
      const interval = 1000 / fps;
      const maxFrames = 300; // 30 seconds at 10fps

      const capture = async () => {
        if (!this.isRecording || this.recordedChunks.length >= maxFrames) return;
        try {
          const screenshot = await page.screenshot({ type: 'png' });
          this.recordedChunks.push(screenshot);
          if (this.isRecording) setTimeout(capture, interval);
        } catch {
          this.isRecording = false;
        }
      };

      setTimeout(capture, interval);
    } catch {}
  }

  /** Stop recording and save as artifact */
  async stopRecording(agentId: string, title: string): Promise<string | null> {
    this.isRecording = false;

    if (this.recordedChunks.length === 0) return null;

    // Store frames as base64 concatenated (simple format)
    const frames = this.recordedChunks.map((b) => b.toString('base64')).join('|FRAME|');

    const artifact = this.artifactStore.create(
      agentId, 'browser_recording', title,
      frames, 'completed',
    );

    this.recordedChunks = [];
    return artifact.id;
  }
}
