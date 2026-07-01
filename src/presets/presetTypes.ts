export type PresetCategory = 'General' | 'Code' | 'Debugging' | 'Specialized';

export type ContextStrategy =
	| 'promptAware'
	| 'selectionOrActiveFile'
	| 'activeFileAndRelatedFiles'
	| 'diagnosticsFocused'
	| 'uiComponentFocused'
	| 'workspaceSummary'
	| 'securityPerformanceFocused'
	| 'buildFailureFocused';

export type PromptPresetId =
	| 'optimize'
	| 'analyzeProblems'
	| 'explainFile'
	| 'refactorSafely'
	| 'askFollowUpQuestions'
	| 'reviewBugs'
	| 'improveUiUx'
	| 'summarizeWorkspace'
	| 'securityPerformancePass'
	| 'diagnoseBuildFailure'
	| 'implementationPlan';

export interface PromptPreset {
	id: PromptPresetId;
	category: PresetCategory;
	label: string;
	description: string;
	actionLabel: string;
	placeholderText: string;
	contextStrategy: ContextStrategy;
	requiresPrompt: boolean;
	defaultGoal: string;
	instruction: string;
}

export type IntentPreset = PromptPreset;
