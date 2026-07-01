import type { PromptPresetId } from '../../presets/promptPresets';

export interface ComposerResult {
	presetId: PromptPresetId;
	prompt: string;
}

export interface FollowUpAnswer {
	question: string;
	answer: string;
}
