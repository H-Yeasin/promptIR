import type { WorkspaceContext } from './contextGatherer';

export type ContextStrategy = 'promptAware' | 'selectionOrActiveFile' | 'activeFileAndRelatedFiles';

export type PromptPresetId = 'optimize' | 'explainFile' | 'refactorSafely' | 'reviewBugs' | 'implementationPlan';

export interface PromptPreset {
	id: PromptPresetId;
	label: string;
	description: string;
	actionLabel: string;
	placeholder: string;
	contextStrategy: ContextStrategy;
	requiresPrompt: boolean;
	defaultGoal: string;
	instruction: string;
}

export const promptPresets: PromptPreset[] = [
	{
		id: 'optimize',
		label: 'Optimize Prompt',
		description: 'Rewrite a rough goal into a context-aware agent prompt.',
		actionLabel: 'Optimize',
		placeholder: 'Describe what you want the agent to do. Add constraints, preferred style, edge cases, or testing expectations here.',
		contextStrategy: 'promptAware',
		requiresPrompt: true,
		defaultGoal: '',
		instruction: [
			'Transform the raw developer goal into a highly descriptive, step-by-step prompt for an AI coding agent.',
			'Preserve the user intent, use the workspace context to make the prompt specific, and include verification steps when useful.'
		].join(' ')
	},
	{
		id: 'explainFile',
		label: 'Explain This File',
		description: 'Ask for architecture, responsibilities, dependencies, and risks.',
		actionLabel: 'Explain',
		placeholder: 'Optional: mention anything specific you want explained about the active file or selection.',
		contextStrategy: 'selectionOrActiveFile',
		requiresPrompt: false,
		defaultGoal: 'Explain the active file or selected code.',
		instruction: [
			'Create a prompt asking the agent to explain the active file or selected code.',
			'The prompt should request architecture, responsibilities, dependencies, data flow, important functions/classes, risks, and a practical reading order.',
			'Do not ask the agent to edit code unless the user explicitly requested changes.'
		].join(' ')
	},
	{
		id: 'refactorSafely',
		label: 'Refactor Safely',
		description: 'Focus on behavior-preserving cleanup and tests.',
		actionLabel: 'Prepare Refactor Prompt',
		placeholder: 'Optional: describe the area that feels messy, duplicated, hard to name, or risky to change.',
		contextStrategy: 'activeFileAndRelatedFiles',
		requiresPrompt: false,
		defaultGoal: 'Refactor this code safely without changing behavior.',
		instruction: [
			'Create a behavior-preserving refactor prompt.',
			'The prompt should focus on cleanup, duplication removal, naming, structure, type clarity, and tests.',
			'It must tell the agent to keep changes scoped, protect public behavior, avoid unrelated rewrites, and verify with existing or targeted tests.'
		].join(' ')
	},
	{
		id: 'reviewBugs',
		label: 'Review For Bugs',
		description: 'Generate a code-review prompt for correctness and regressions.',
		actionLabel: 'Prepare Review Prompt',
		placeholder: 'Optional: describe the feature, flow, or risk area the review should focus on.',
		contextStrategy: 'activeFileAndRelatedFiles',
		requiresPrompt: false,
		defaultGoal: 'Review this code for bugs.',
		instruction: [
			'Create a code-review style prompt.',
			'The prompt should ask the agent to prioritize correctness bugs, edge cases, regressions, security issues, bad async/state handling, and missing tests.',
			'It should request findings first with file/line references when possible, followed by concise fix suggestions.'
		].join(' ')
	},
	{
		id: 'implementationPlan',
		label: 'Prepare Implementation Plan',
		description: 'Convert a goal into a step-by-step plan without code edits.',
		actionLabel: 'Prepare Plan',
		placeholder: 'Describe the feature, bug, or change you want planned. The output will not ask the agent to edit code yet.',
		contextStrategy: 'promptAware',
		requiresPrompt: true,
		defaultGoal: '',
		instruction: [
			'Create a planning-only prompt for an AI coding agent.',
			'The prompt should ask for a step-by-step engineering plan, relevant files to inspect, likely risks, test strategy, and open questions.',
			'It must explicitly say not to edit code yet.'
		].join(' ')
	}
];

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
