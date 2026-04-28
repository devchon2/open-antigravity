import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchContributionsRegistry, Extensions } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';

class AntigravityContribution extends Disposable {
  constructor(@IInstantiationService private readonly is: IInstantiationService) {
    super();
    console.log('[Open-Antigravity] Agent workbench contribution activated');
    this.init();
  }

  private async init(): Promise<void> {
    console.log('[Open-Antigravity] Scanning skills, workflows, loading artifacts...');
  }
}

Registry.as<IWorkbenchContributionsRegistry>(Extensions.Workbench).registerWorkbenchContribution(
  AntigravityContribution,
  LifecyclePhase.Restored,
);
