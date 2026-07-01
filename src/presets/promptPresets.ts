import type { WorkspaceContext } from '../context/contextTypes';
import { promptPresets } from './presetDefinitions';
import type { PromptPreset } from './presetTypes';

export type {
	ContextStrategy,
	IntentPreset,
	PresetCategory,
	PromptPreset,
	PromptPresetId
} from './presetTypes';

export { promptPresets } from './presetDefinitions';

export const AVAILABLE_PRESETS = promptPresets;

export function getPromptPreset(id: string | undefined): PromptPreset {
	return promptPresets.find(preset => preset.id === id) ?? promptPresets[0];
}

export function getPromptForPreset(rawPrompt: string, preset: PromptPreset): string {
	const trimmedPrompt = rawPrompt.trim();

	if (trimmedPrompt) {
		return trimmedPrompt;
	}

	return preset.defaultGoal;
}

export function describePresetContext(context: WorkspaceContext, preset: PromptPreset): string {
	const relatedCount = context.relatedFiles?.length ?? 0;
	const diagnosticCount = context.diagnostics?.length ?? 0;

	return [
		`Selected preset: ${preset.label}`,
		`Context strategy: ${preset.contextStrategy}`,
		`Retrieved files: ${relatedCount}`,
		`Diagnostics: ${diagnosticCount}`
	].join('\n');
}
