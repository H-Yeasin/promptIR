import * as vscode from 'vscode';
import type { ContextStrategy } from '../presets/presetTypes';
import { collectRelevantDiagnostics, readDiagnosticFiles } from './diagnostics';
import { mergeContextFiles, truncateContext } from './contextText';
import { findRelevantWorkspaceFiles, findWorkspaceSummaryFiles } from './workspaceFiles';
import type { WorkspaceContext } from './contextTypes';

export type { ContextDiagnostic, ContextFile, WorkspaceContext } from './contextTypes';
export { truncateContext } from './contextText';

export function getActiveEditorContext(): WorkspaceContext | null {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		return null;
	}

	const { document, selection } = editor;
	const selectedText = selection.isEmpty
		? document.getText()
		: document.getText(selection);

	return {
		fileName: document.fileName,
		languageId: document.languageId,
		selectedText
	};
}

export async function getPromptAwareWorkspaceContext(
	rawPrompt: string,
	baseContext: WorkspaceContext,
	contextStrategy: ContextStrategy = 'promptAware'
): Promise<WorkspaceContext> {
	if (contextStrategy === 'buildFailureFocused') {
		const diagnosticFiles = await readDiagnosticFiles(
			collectRelevantDiagnostics(baseContext.fileName, [], contextStrategy),
			baseContext.fileName
		);
		const summaryFiles = await findWorkspaceSummaryFiles(rawPrompt, baseContext.fileName, 4);
		const relatedFiles = mergeContextFiles([...diagnosticFiles, ...summaryFiles]);
		const diagnostics = collectRelevantDiagnostics(baseContext.fileName, relatedFiles, contextStrategy);

		return {
			...trimBaseContext(baseContext, contextStrategy),
			relatedFiles,
			diagnostics
		};
	}

	if (contextStrategy === 'workspaceSummary') {
		const relatedFiles = await findWorkspaceSummaryFiles(rawPrompt, baseContext.fileName);
		const diagnostics = collectRelevantDiagnostics(baseContext.fileName, relatedFiles, contextStrategy);

		return {
			...trimBaseContext(baseContext, contextStrategy),
			relatedFiles,
			diagnostics
		};
	}

	if (contextStrategy === 'diagnosticsFocused') {
		const diagnostics = collectRelevantDiagnostics(baseContext.fileName, [], contextStrategy);
		const relatedFiles = await readDiagnosticFiles(diagnostics, baseContext.fileName);
		const prioritizedDiagnostics = collectRelevantDiagnostics(baseContext.fileName, relatedFiles, contextStrategy);

		return {
			...trimBaseContext(baseContext, contextStrategy),
			relatedFiles,
			diagnostics: prioritizedDiagnostics
		};
	}

	const relatedFiles = await findRelevantWorkspaceFiles(
		getContextSearchText(rawPrompt, baseContext, contextStrategy),
		baseContext.fileName,
		contextStrategy
	);
	const diagnostics = collectRelevantDiagnostics(baseContext.fileName, relatedFiles, contextStrategy);

	return {
		...trimBaseContext(baseContext, contextStrategy),
		relatedFiles,
		diagnostics
	};
}

function trimBaseContext(baseContext: WorkspaceContext, contextStrategy: ContextStrategy): WorkspaceContext {
	if (contextStrategy === 'workspaceSummary') {
		return {
			...baseContext,
			selectedText: truncateContext(baseContext.selectedText, 3000)
		};
	}

	if (contextStrategy === 'activeFileAndRelatedFiles') {
		return {
			...baseContext,
			selectedText: truncateContext(baseContext.selectedText, 5000)
		};
	}

	return baseContext;
}

function getContextSearchText(
	rawPrompt: string,
	baseContext: WorkspaceContext,
	contextStrategy: ContextStrategy
): string {
	if (
		contextStrategy === 'activeFileAndRelatedFiles'
		|| contextStrategy === 'diagnosticsFocused'
		|| contextStrategy === 'uiComponentFocused'
		|| contextStrategy === 'securityPerformanceFocused'
		|| contextStrategy === 'buildFailureFocused'
	) {
		return [
			rawPrompt,
			vscode.workspace.asRelativePath(baseContext.fileName),
			baseContext.languageId
		].join(' ');
	}

	return rawPrompt;
}
