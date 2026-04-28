import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions } from '../../../../common/contributions.js';
import { LifecyclePhase } from '../../../../services/lifecycle/common/lifecycle.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { KeybindingsRegistry } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';

export const AG_CHAT = 'antigravity.openChat';
export const AG_MANAGER = 'antigravity.openAgentManager';
export const AG_INLINE = 'antigravity.inlineCommand';
export const AG_EXPLAIN = 'antigravity.explainCode';
export const AG_SEND = 'antigravity.sendToAgent';
export const AG_TESTS = 'antigravity.generateTests';
export const AG_TOGGLE = 'antigravity.toggleView';

class AntigravityContribution extends Disposable {
  constructor() {
    super();
    this.init();
  }

  private init(): void {
    CommandsRegistry.registerCommand(AG_CHAT, () => console.log('[Antigravity] Chat opened'));
    CommandsRegistry.registerCommand(AG_MANAGER, () => console.log('[Antigravity] Agent Manager'));
    CommandsRegistry.registerCommand(AG_INLINE, () => console.log('[Antigravity] Inline cmd'));
    CommandsRegistry.registerCommand(AG_EXPLAIN, () => console.log('[Antigravity] Explain code'));
    CommandsRegistry.registerCommand(AG_SEND, () => console.log('[Antigravity] Send to agent'));
    CommandsRegistry.registerCommand(AG_TESTS, () => console.log('[Antigravity] Generate tests'));
    CommandsRegistry.registerCommand(AG_TOGGLE, () => console.log('[Antigravity] Toggle view'));

    KeybindingsRegistry.registerKeybindingRule({
      id: AG_CHAT, weight: 200, primary: 2048 | 37, mac: { primary: 512 | 37 },
    });
    KeybindingsRegistry.registerKeybindingRule({
      id: AG_INLINE, weight: 200, primary: 2048 | 23, mac: { primary: 512 | 23 },
    });
    KeybindingsRegistry.registerKeybindingRule({
      id: AG_TOGGLE, weight: 200, primary: 2048 | 5, mac: { primary: 512 | 5 },
    });

    console.log('[Open-Antigravity] Agent system initialized');
  }
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
  .registerWorkbenchContribution(AntigravityContribution, LifecyclePhase.Restored);
