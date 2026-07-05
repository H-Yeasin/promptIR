import * as vscode from 'vscode';
import { GraphifyDriver, type GraphifyRelationshipMap } from '../graphifyDriver';
import type { ContextStrategy } from '../presets/presetTypes';
import { collectRelevantDiagnostics, readDiagnosticFiles } from './diagnostics';
import { mergeContextFiles, truncateContext } from './contextText';
import { findRelevantWorkspaceFiles, findWorkspaceSummaryFiles } from './workspaceFiles';
import type { WorkspaceContext } from './contextTypes';

const graphifyDriver = new GraphifyDriver();

export type { ContextDiagnostic, ContextFile, WorkspaceContext } from './contextTypes';
export { truncateContext } from './contextText';

export function getActiveEditorContext(): WorkspaceContext | null {
	const editor = vscode.window.activeTextEditor ?? vscode.window.visibleTextEditors[0];

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
	const contextAnchor = await resolvePromptContextAnchor(rawPrompt, baseContext);
	const graphifyContext = await getGraphifyContext(contextAnchor.fileName);

	if (contextStrategy === 'buildFailureFocused') {
		const diagnosticFiles = await readDiagnosticFiles(
			collectRelevantDiagnostics(contextAnchor.fileName, [], contextStrategy),
			contextAnchor.fileName
		);
		const summaryFiles = await findWorkspaceSummaryFiles(rawPrompt, contextAnchor.fileName, 4);
		const relatedFiles = mergeContextFiles([...diagnosticFiles, ...summaryFiles]);
		const diagnostics = collectRelevantDiagnostics(contextAnchor.fileName, relatedFiles, contextStrategy);

		return {
			...trimBaseContext(contextAnchor, contextStrategy),
			graphifyContext,
			relatedFiles,
			diagnostics
		};
	}

	if (contextStrategy === 'workspaceSummary') {
		const relatedFiles = await findWorkspaceSummaryFiles(rawPrompt, contextAnchor.fileName);
		const diagnostics = collectRelevantDiagnostics(contextAnchor.fileName, relatedFiles, contextStrategy);

		return {
			...trimBaseContext(contextAnchor, contextStrategy),
			graphifyContext,
			relatedFiles,
			diagnostics
		};
	}

	if (contextStrategy === 'diagnosticsFocused') {
		const diagnostics = collectRelevantDiagnostics(contextAnchor.fileName, [], contextStrategy);
		const relatedFiles = await readDiagnosticFiles(diagnostics, contextAnchor.fileName);
		const prioritizedDiagnostics = collectRelevantDiagnostics(contextAnchor.fileName, relatedFiles, contextStrategy);

		return {
			...trimBaseContext(contextAnchor, contextStrategy),
			graphifyContext,
			relatedFiles,
			diagnostics: prioritizedDiagnostics
		};
	}

	const relatedFiles = await findRelevantWorkspaceFiles(
		getContextSearchText(rawPrompt, contextAnchor, contextStrategy),
		contextAnchor.fileName,
		contextStrategy
	);
	const diagnostics = collectRelevantDiagnostics(contextAnchor.fileName, relatedFiles, contextStrategy);

	return {
		...trimBaseContext(contextAnchor, contextStrategy),
		graphifyContext,
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

async function resolvePromptContextAnchor(
	rawPrompt: string,
	baseContext: WorkspaceContext
): Promise<WorkspaceContext> {
	const referencedUri = await findPromptReferencedFile(rawPrompt);

	if (!referencedUri) {
		return baseContext;
	}

	try {
		const document = await vscode.workspace.openTextDocument(referencedUri);

		return {
			fileName: document.fileName,
			languageId: document.languageId,
			selectedText: document.getText(),
			promptReferencedFileName: document.fileName
		};
	} catch {
		return baseContext;
	}
}

async function findPromptReferencedFile(rawPrompt: string): Promise<vscode.Uri | undefined> {
	const fileReferences = extractFileReferences(rawPrompt);

	for (const reference of fileReferences) {
		const normalizedReference = normalizePromptPath(reference);
		const basename = normalizedReference.split('/').at(-1);

		if (!basename) {
			continue;
		}

		const matches = await vscode.workspace.findFiles(`**/${basename}`, '**/{node_modules,.git,dist,build,out,coverage,.dart_tool}/**', 20);
		const match = matches.find(uri => normalizePromptPath(vscode.workspace.asRelativePath(uri)).endsWith(normalizedReference))
			?? matches.find(uri => normalizePromptPath(uri.fsPath).includes(normalizedReference));

		if (match) {
			return match;
		}
	}

	return undefined;
}

function extractFileReferences(rawPrompt: string): string[] {
	const fileReferencePattern = /(?:[A-Za-z]:)?(?:[\w.-]+[\\/])+[\w.-]+\.(?:ts|tsx|js|jsx|dart|py|java|kt|swift|go|rs|cs|php|rb|html|css|scss|json|yaml|yml|md)|\b[\w.-]+\.(?:ts|tsx|js|jsx|dart|py|java|kt|swift|go|rs|cs|php|rb|html|css|scss|json|yaml|yml|md)/gi;

	return [...rawPrompt.matchAll(fileReferencePattern)]
		.map(match => match[0].trim().replace(/^["'`]+|["'`.,;:]+$/g, ''))
		.filter(Boolean);
}

function normalizePromptPath(filePath: string): string {
	return filePath.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

async function getGraphifyContext(activeFileName: string): Promise<string | undefined> {
	try {
		const installed = await graphifyDriver.checkInstallation();

		if (!installed) {
			return undefined;
		}

		const relationshipMap = await graphifyDriver.getRelatedContext(activeFileName);

		if (!relationshipMap) {
			return undefined;
		}

		return formatGraphifyRelationshipMap(relationshipMap);
	} catch {
		return undefined;
	}
}

function formatGraphifyRelationshipMap(map: GraphifyRelationshipMap): string {
	return [
		'[GRAPHIFY RELATIONSHIP MAP]',
		`Active file: ${map.activeFile}`,
		`Cluster: ${map.cluster ?? 'unknown'}`,
		`Degree score: ${map.degree}`,
		'',
		'Upstream dependencies:',
		...formatGraphifyNodes(map.upstream),
		'',
		'Downstream dependents:',
		...formatGraphifyNodes(map.downstream),
		'',
		'Connected edges:',
		...formatGraphifyEdges(map.edges),
		'[/GRAPHIFY RELATIONSHIP MAP]'
	].join('\n');
}

function formatGraphifyNodes(nodes: GraphifyRelationshipMap['upstream']): string[] {
	if (!nodes.length) {
		return ['- none'];
	}

	return nodes.map(node => `- ${node.fileName} (cluster: ${node.cluster ?? 'unknown'}, degree: ${node.degree})`);
}

function formatGraphifyEdges(edges: GraphifyRelationshipMap['edges']): string[] {
	if (!edges.length) {
		return ['- none'];
	}

	return edges.map(edge => `- ${edge.source} -> ${edge.target}${edge.type ? ` (${edge.type})` : ''}`);
}
