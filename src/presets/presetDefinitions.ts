import type { PromptPreset } from './presetTypes';

export const promptPresets: PromptPreset[] = [
	{
		id: 'optimize',
		category: 'General',
		label: 'Optimize Prompt',
		description: 'Rewrite a rough goal into a context-aware agent prompt.',
		actionLabel: 'Optimize',
		placeholderText: 'Describe what you want the agent to do. Add constraints, preferred style, edge cases, or testing expectations here.',
		contextStrategy: 'promptAware',
		requiresPrompt: true,
		defaultGoal: 'Optimize the current developer task into a specific, context-aware prompt for an AI coding agent.',
		instruction: [
			'Transform the raw developer goal into a highly descriptive, step-by-step prompt for an AI coding agent.',
			'Preserve the user intent, use the workspace context to make the prompt specific, and include verification steps when useful.',
			'Inject strict architectural layout constraints into the generated prompt: the downstream coding agent must prioritize clean folder structure, robust directory layout, explicit module boundaries, and code readability before implementation.',
			'Require the downstream coding agent to output an ASCII directory tree that maps the intended file hierarchy before writing any code blocks. The tree must show new files, modified files, and where each responsibility belongs.',
			'Require explicit file boundaries in the final prompt: each requested code block or edit section must name the target path and describe that file responsibility before code is written.',
			'Enforce readability rules in the generated prompt: prefer low cyclomatic complexity, early-return guard patterns, semantic variable and function names, short cohesive functions, clear dependency direction, and simple control flow over clever abstractions.',
			'Tell the downstream coding agent to keep related concerns grouped by feature or domain, avoid dumping unrelated helpers into generic files, and create small focused modules only when they improve maintainability.'
		].join(' ')
	},
	{
		id: 'analyzeProblems',
		category: 'Debugging',
		label: 'Analyze Current Problems',
		description: 'Use VS Code diagnostics to prepare a focused fix prompt.',
		actionLabel: 'Analyze Problems',
		placeholderText: 'Optional: add recent changes, failing behavior, or constraints the agent should respect while fixing diagnostics.',
		contextStrategy: 'diagnosticsFocused',
		requiresPrompt: false,
		defaultGoal: 'Investigate and fix the current VS Code Problems diagnostics safely.',
		instruction: [
			'Create a focused debugging and fix prompt for an AI coding agent.',
			'The prompt should prioritize current VS Code diagnostics, active file context, files referenced by diagnostics, likely root causes, safe fix order, and verification steps.',
			'It should tell the agent to make scoped changes, avoid unrelated cleanup, and explain if any diagnostic appears stale or caused by generated/dependency files.'
		].join(' ')
	},
	{
		id: 'explainFile',
		category: 'Code',
		label: 'Explain This File',
		description: 'Ask for architecture, responsibilities, dependencies, and risks.',
		actionLabel: 'Explain',
		placeholderText: 'Optional: mention anything specific you want explained about the active file or selection.',
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
		category: 'Code',
		label: 'Refactor Safely',
		description: 'Focus on behavior-preserving cleanup and tests.',
		actionLabel: 'Prepare Refactor Prompt',
		placeholderText: 'Optional: describe the area that feels messy, duplicated, hard to name, or risky to change.',
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
		id: 'askFollowUpQuestions',
		category: 'General',
		label: 'Ask Follow-Up Questions',
		description: 'Generate 3-5 clarifying questions instead of a full prompt.',
		actionLabel: 'Ask Questions',
		placeholderText: 'Describe the rough or vague goal. PromptIR will turn it into practical clarifying questions.',
		contextStrategy: 'selectionOrActiveFile',
		requiresPrompt: false,
		defaultGoal: 'Ask clarifying questions before creating an agent prompt.',
		instruction: [
			'Create only 3-5 concise clarifying questions for the user before a coding agent prompt is written.',
			'The questions should resolve ambiguity about goal, scope, constraints, target files, expected behavior, and verification.',
			'Do not produce an implementation prompt, plan, code, or answer. Return only the questions.'
		].join(' ')
	},
	{
		id: 'reviewBugs',
		category: 'Code',
		label: 'Review For Bugs',
		description: 'Generate a code-review prompt for correctness and regressions.',
		actionLabel: 'Prepare Review Prompt',
		placeholderText: 'Optional: describe the feature, flow, or risk area the review should focus on.',
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
		id: 'improveUiUx',
		category: 'Specialized',
		label: 'Improve UI/UX',
		description: 'Gather component, page, style, and theme context.',
		actionLabel: 'Prepare UI/UX Prompt',
		placeholderText: 'Optional: describe the screen, component, user flow, or design direction you want improved.',
		contextStrategy: 'uiComponentFocused',
		requiresPrompt: false,
		defaultGoal: 'Improve the UI and UX of the active component or screen.',
		instruction: [
			'Create a UI/UX improvement prompt for an AI coding agent.',
			'The prompt should ask for polished visual hierarchy, spacing, accessibility, responsive behavior, interaction states, loading/empty/error states, and consistency with existing component/theme patterns.',
			'It should tell the agent to inspect relevant component, page, style, and theme files, keep changes scoped to the user-facing experience, and verify on realistic viewport sizes.'
		].join(' ')
	},
	{
		id: 'summarizeWorkspace',
		category: 'Specialized',
		label: 'Summarize Workspace Context',
		description: 'Create a compact project map for external agents.',
		actionLabel: 'Summarize Workspace',
		placeholderText: 'Optional: mention the feature area, folder, or technology the project map should emphasize.',
		contextStrategy: 'workspaceSummary',
		requiresPrompt: false,
		defaultGoal: 'Summarize this workspace into a compact project map.',
		instruction: [
			'Create a compact workspace-context prompt for an external AI coding agent.',
			'The prompt should summarize project purpose, likely tech stack, important directories/files, architecture signals, existing conventions, risks, and what context to inspect next.',
			'It should avoid asking the agent to edit code and should avoid dumping long file contents.'
		].join(' ')
	},
	{
		id: 'securityPerformancePass',
		category: 'Specialized',
		label: 'Security/Performance Pass',
		description: 'Look for risky code paths and inefficient behavior.',
		actionLabel: 'Prepare Risk Prompt',
		placeholderText: 'Optional: describe the request flow, API, screen, or code path that should get the risk/performance review.',
		contextStrategy: 'securityPerformanceFocused',
		requiresPrompt: false,
		defaultGoal: 'Review this code for security and performance risks.',
		instruction: [
			'Create a security and performance review prompt for an AI coding agent.',
			'The prompt should ask the agent to inspect unsafe input handling, auth/session risks, secret handling, database/query risks, network/file access, expensive loops, bad async handling, memory leaks, caching issues, and missing tests.',
			'It should request prioritized findings first, then small scoped fixes with verification steps. It should avoid speculative rewrites.'
		].join(' ')
	},
	{
		id: 'diagnoseBuildFailure',
		category: 'Debugging',
		label: 'Diagnose Build Failure',
		description: 'Combine pasted build output with diagnostics and related files.',
		actionLabel: 'Diagnose Build',
		placeholderText: 'Paste terminal build log errors here. Include the failed command, stack trace, compiler/test output, and recent changes if you know them.',
		contextStrategy: 'buildFailureFocused',
		requiresPrompt: true,
		defaultGoal: 'Diagnose the current build or test failure using available diagnostics and workspace context.',
		instruction: [
			'Create a focused build-failure debugging prompt for an AI coding agent.',
			'The raw goal may contain terminal, build, compiler, or test output. The prompt should preserve the important errors, connect them to diagnostics and relevant files, identify likely root causes, and propose a safe investigation/fix order.',
			'It should tell the agent to avoid unrelated cleanup, verify by rerunning the failing command when possible, and report if output appears truncated or missing the root error.'
		].join(' ')
	},
	{
		id: 'implementationPlan',
		category: 'General',
		label: 'Prepare Implementation Plan',
		description: 'Convert a goal into a step-by-step plan without code edits.',
		actionLabel: 'Prepare Plan',
		placeholderText: 'Describe the feature, bug, or change you want planned. The output will not ask the agent to edit code yet.',
		contextStrategy: 'promptAware',
		requiresPrompt: true,
		defaultGoal: 'Prepare a step-by-step engineering implementation plan using the current workspace context.',
		instruction: [
			'Create a planning-only prompt for an AI coding agent.',
			'Lock the downstream coding agent into Structural Planning Mode.',
			'Structural Planning Mode forbids editing code files, generating patches, or writing implementation code until folder paths, dependency relationships, module boundaries, and class or interface contracts are structurally designed.',
			'The prompt should require a step-by-step engineering plan, relevant files to inspect, likely risks, test strategy, and open questions.',
			'Require an ASCII directory tree that proposes the clean target layout before any implementation discussion. The tree must distinguish existing files, new files, moved files, and files that should remain untouched.',
			'Require an explicit dependency map that explains which modules/classes/functions may depend on each other and which dependencies are forbidden to preserve a clean architecture.',
			'Require proposed class, function, component, or interface signatures before any code edits are allowed.',
			'It must explicitly say not to edit code yet and not to proceed to implementation until the structural plan is reviewed or accepted.'
		].join(' ')
	}
];
