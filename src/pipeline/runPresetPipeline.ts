import { processPromptWithAI } from '../ai/aiEngine';
import { getPromptAwareWorkspaceContext, WorkspaceContext } from '../context/contextGatherer';
import { GraphifyDriver } from '../graphifyDriver';
import { getPromptForPreset, PromptPreset } from '../presets/promptPresets';
import type { PromptProcessingOptions } from '../ai/aiEngine';

const graphifyDriver = new GraphifyDriver();

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

	options.onStatus?.('Preparing Graphify relationship index...');
	await graphifyDriver.ensureGraphIndex().catch((error: unknown) => {
		console.error('PromptIR: Graphify index preparation failed.', error);
		return false;
	});
	options.onStatus?.('Gathering files, Graphify relationships, and diagnostics...');

	const promptAwareContext = await getPromptAwareWorkspaceContext(
		rawPrompt.trim(),
		workspaceContext,
		preset.contextStrategy
	);

	return processPromptWithAI(rawPrompt.trim(), promptAwareContext, preset, options);
}
