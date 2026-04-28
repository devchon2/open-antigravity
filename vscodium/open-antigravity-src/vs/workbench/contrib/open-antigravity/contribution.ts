/*---------------------------------------------------------------------------------------------
 *  Open-IDE — built INTO VSCodium (not an extension)
 *  Main workbench contribution. Registers the agent system via VSCodium's DI lifecycle.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchContributionsRegistry, Extensions } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';

class OpenAntigravityContribution extends Disposable {

  constructor(
    @IInstantiationService private readonly instantiationService: IInstantiationService,
    @IEditorService private readonly editorService: IEditorService,
  ) {
    super();
    console.log('[Open-Antigravity] IDE agent system activated');
    this.init();
  }

  private async init(): Promise<void> {
    // Progressive disclosure: scan skills and workflows at startup
    const { SkillLoader } = await import('../open-antigravity/agent/SkillLoader.js');
    const { WorkflowLoader } = await import('../open-antigravity/agent/WorkflowLoader.js');
    const skills = new SkillLoader();
    const workflows = new WorkflowLoader();
    await skills.scan();
    await workflows.scan();
    console.log(
      `[Open-Antigravity] ${skills.getMetadata().length} skills, ${workflows.getAll().length} workflows loaded`,
    );
  }
}

Registry.as<IWorkbenchContributionsRegistry>(Extensions.Workbench).registerWorkbenchContribution(
  OpenAntigravityContribution,
  LifecyclePhase.Restored,
);
