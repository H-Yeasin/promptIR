import type { PromptPresetId } from '../../presets/promptPresets';

export interface ComposerResult {
	presetId: PromptPresetId;
	prompt: string;
}
