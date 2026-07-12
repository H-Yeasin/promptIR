import * as vscode from 'vscode';
import { GrepaiDriver, type GrepaiHit } from '../grepaiDriver';
import type { ContextStrategy } from '../presets/presetTypes';
import { collectRelevantDiagnostics, readDiagnosticFiles } from './diagnostics';
import { mergeContextFiles, truncateContext } from './contextText';
import { findRelevantWorkspaceFiles, findWorkspaceSummaryFiles } from './workspaceFiles';
import type { ContextFile, WorkspaceContext } from './contextTypes';

const grepaiDriver = new GrepaiDriver();

const SEMANTIC_SNIPPET_PADDING_LINES = 10;
const SEMANTIC_SNIPPET_MAX_CHARS = 4000;
const SEMANTIC_SCORE_BASE = 100;

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
	const promptReferencedFileNames = await resolveAllPromptReferencedFiles(rawPrompt);

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
			relatedFiles,
			diagnostics,
			promptReferencedFileNames
		};
	}

	if (contextStrategy === 'workspaceSummary') {
		const relatedFiles = await findWorkspaceSummaryFiles(rawPrompt, contextAnchor.fileName);
		const diagnostics = collectRelevantDiagnostics(contextAnchor.fileName, relatedFiles, contextStrategy);

		return {
			...trimBaseContext(contextAnchor, contextStrategy),
			relatedFiles,
			diagnostics,
			promptReferencedFileNames
		};
	}

	if (contextStrategy === 'diagnosticsFocused') {
		const diagnostics = collectRelevantDiagnostics(contextAnchor.fileName, [], contextStrategy);
		const relatedFiles = await readDiagnosticFiles(diagnostics, contextAnchor.fileName);
		const prioritizedDiagnostics = collectRelevantDiagnostics(contextAnchor.fileName, relatedFiles, contextStrategy);

		return {
			...trimBaseContext(contextAnchor, contextStrategy),
			relatedFiles,
			diagnostics: prioritizedDiagnostics,
			promptReferencedFileNames
		};
	}

	const keywordFiles = await findRelevantWorkspaceFiles(
		getContextSearchText(rawPrompt, contextAnchor, contextStrategy),
		contextAnchor.fileName,
		contextStrategy
	);

	let relatedFiles = keywordFiles;
	let semanticHitFiles: string[] | undefined;

	if (isSemanticEligible(contextStrategy)) {
		const semanticResult = await getSemanticRelatedFiles(rawPrompt);

		if (semanticResult) {
			relatedFiles = mergeSemanticAndKeywordFiles(semanticResult.files, keywordFiles);
			semanticHitFiles = semanticResult.hitFileNames;
		}
	}

	const diagnostics = collectRelevantDiagnostics(contextAnchor.fileName, relatedFiles, contextStrategy);

	return {
		...trimBaseContext(contextAnchor, contextStrategy),
		relatedFiles,
		diagnostics,
		promptReferencedFileNames,
		semanticHitFiles
	};
}

function isSemanticEligible(contextStrategy: ContextStrategy): boolean {
	return contextStrategy === 'promptAware'
		|| contextStrategy === 'securityPerformanceFocused'
		|| contextStrategy === 'uiComponentFocused';
}

interface SemanticRetrievalResult {
	files: ContextFile[];
	hitFileNames: string[];
}

async function getSemanticRelatedFiles(rawPrompt: string): Promise<SemanticRetrievalResult | undefined> {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

	if (!workspaceRoot) {
		return undefined;
	}

	const status = await grepaiDriver.detectGrepai();

	if (status !== 'ready') {
		return undefined;
	}

	const maxResults = vscode.workspace.getConfiguration('promptir').get<number>('grepai.maxResults', 5);
	const hits = await grepaiDriver.semanticSearch(rawPrompt, { maxResults, cwd: workspaceRoot });

	if (!hits?.length) {
		return undefined;
	}

	const files: ContextFile[] = [];
	const hitFileNames: string[] = [];

	for (const hit of hits) {
		hitFileNames.push(hit.file);
		const contextFile = await buildSemanticContextFile(hit);

		if (contextFile) {
			files.push(contextFile);
		}
	}

	if (!files.length) {
		return undefined;
	}

	return { files, hitFileNames };
}

async function buildSemanticContextFile(hit: GrepaiHit): Promise<ContextFile | undefined> {
	try {
		const document = await vscode.workspace.openTextDocument(vscode.Uri.file(hit.file));
		const startLine = Math.max(0, hit.startLine - 1 - SEMANTIC_SNIPPET_PADDING_LINES);
		const endLine = Math.min(document.lineCount - 1, hit.endLine - 1 + SEMANTIC_SNIPPET_PADDING_LINES);
		const lines: string[] = [];

		for (let line = startLine; line <= endLine; line++) {
			lines.push(`${line + 1}: ${document.lineAt(line).text}`);
		}

		const relativePath = vscode.workspace.asRelativePath(document.uri);
		const text = [
			`Semantic match: ${relativePath} (lines ${hit.startLine}-${hit.endLine}, score ${hit.score.toFixed(2)})`,
			lines.join('\n')
		].join('\n');

		return {
			fileName: document.fileName,
			languageId: document.languageId,
			text: truncateContext(text, SEMANTIC_SNIPPET_MAX_CHARS),
			score: SEMANTIC_SCORE_BASE + hit.score
		};
	} catch {
		return undefined;
	}
}

export function mergeSemanticAndKeywordFiles(semanticFiles: ContextFile[], keywordFiles: ContextFile[]): ContextFile[] {
	const semanticFileNames = new Set(semanticFiles.map(file => file.fileName));
	const combined = [
		...semanticFiles,
		...keywordFiles.filter(file => !semanticFileNames.has(file.fileName))
	];

	return mergeContextFiles(combined);
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
	for (const reference of extractFileReferences(rawPrompt)) {
		const match = await resolveReferenceUri(reference);

		if (match) {
			return match;
		}
	}

	return undefined;
}

async function resolveAllPromptReferencedFiles(rawPrompt: string): Promise<string[]> {
	const resolved: string[] = [];
	const seen = new Set<string>();

	for (const reference of extractFileReferences(rawPrompt)) {
		const match = await resolveReferenceUri(reference);

		if (match && !seen.has(match.fsPath)) {
			seen.add(match.fsPath);
			resolved.push(match.fsPath);
		}
	}

	return resolved;
}

async function resolveReferenceUri(reference: string): Promise<vscode.Uri | undefined> {
	const normalizedReference = normalizePromptPath(reference);
	const basename = normalizedReference.split('/').at(-1);

	if (!basename) {
		return undefined;
	}

	const matches = await vscode.workspace.findFiles(`**/${basename}`, '**/{node_modules,.git,dist,build,out,coverage,.dart_tool}/**', 20);

	return matches.find(uri => normalizePromptPath(vscode.workspace.asRelativePath(uri)).endsWith(normalizedReference))
		?? matches.find(uri => normalizePromptPath(uri.fsPath).includes(normalizedReference));
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
