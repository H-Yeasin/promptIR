import { processPromptWithAI } from '../ai/aiEngine';
import { getPromptAwareWorkspaceContext, WorkspaceContext } from '../context/contextGatherer';
import { getPromptForPreset, PromptPreset } from '../presets/promptPresets';
import type { PromptProcessingOptions } from '../ai/aiEngine';

export async function runPresetPipeline(
	prompt: string,
	workspaceContext: WorkspaceContext,
	preset: PromptPreset,
	options: PromptProcessingOptions = {}
): Promise<string> {
	const rawPrompt = getPromptForPreset(prompt, preset);

	if (preset.requiresPrompt && !rawPrompt.trim()) {
		throw new Error(`${preset.label} needs input before PromptIR can continue.`);
	}

	const promptAwareContext = await getPromptAwareWorkspaceContext(
		rawPrompt.trim(),
		workspaceContext,
		preset.contextStrategy
	);

	return processPromptWithAI(rawPrompt.trim(), promptAwareContext, preset, options);
}
