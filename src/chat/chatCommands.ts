import type { PromptPresetId } from '../presets/promptPresets';

export const chatCommandPresetIds = new Map<string, PromptPresetId>([
	['optimize', 'optimize'],
	['review', 'reviewBugs'],
	['explain', 'explainFile'],
	['problems', 'analyzeProblems'],
	['plan', 'implementationPlan']
]);
