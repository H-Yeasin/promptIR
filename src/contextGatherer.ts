import * as vscode from 'vscode';
import type { ContextStrategy } from './promptPresets';

export interface ContextFile {
	fileName: string;
	languageId: string;
	text: string;
	score: number;
}

export interface ContextDiagnostic {
	fileName: string;
	line: number;
	column: number;
	severity: string;
	message: string;
	source?: string;
}

export interface WorkspaceContext {
	fileName: string;
	languageId: string;
	selectedText: string;
	relatedFiles?: ContextFile[];
	diagnostics?: ContextDiagnostic[];
}

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
	const relatedFiles = await findRelevantWorkspaceFiles(
		getContextSearchText(rawPrompt, baseContext, contextStrategy),
		baseContext.fileName,
		contextStrategy
	);
	const diagnostics = collectRelevantDiagnostics(baseContext.fileName, relatedFiles);

	return {
		...baseContext,
		relatedFiles,
		diagnostics
	};
}

async function findRelevantWorkspaceFiles(
	rawPrompt: string,
	activeFileName: string,
	contextStrategy: ContextStrategy
): Promise<ContextFile[]> {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders?.length) {
		return [];
	}

	if (contextStrategy === 'selectionOrActiveFile') {
		return [];
	}

	const keywords = extractKeywords(rawPrompt);

	if (!keywords.length) {
		return [];
	}

	const files = await vscode.workspace.findFiles(
		'**/*.{ts,tsx,js,jsx,dart,py,java,kt,swift,go,rs,cs,php,rb,html,css,scss,json,yaml,yml,md}',
		'**/{node_modules,.git,dist,build,out,coverage,.dart_tool,ios,android,windows,macos,linux}/**',
		200
	);

	const ranked = files
		.map(uri => ({
			uri,
			score: scoreFile(uri, keywords, activeFileName)
		}))
		.filter(candidate => candidate.score > 0)
		.sort((left, right) => right.score - left.score)
		.slice(0, 5);

	const relatedFiles: ContextFile[] = [];

	for (const candidate of ranked) {
		try {
			const document = await vscode.workspace.openTextDocument(candidate.uri);
			const text = document.getText();

			relatedFiles.push({
				fileName: document.fileName,
				languageId: document.languageId,
				text: text.slice(0, 6000),
				score: candidate.score
			});
		} catch {
			// Ignore files VS Code cannot open as text.
		}
	}

	return relatedFiles;
}

function getContextSearchText(
	rawPrompt: string,
	baseContext: WorkspaceContext,
	contextStrategy: ContextStrategy
): string {
	if (contextStrategy === 'activeFileAndRelatedFiles') {
		return [
			rawPrompt,
			vscode.workspace.asRelativePath(baseContext.fileName),
			baseContext.languageId
		].join(' ');
	}

	return rawPrompt;
}

function extractKeywords(rawPrompt: string): string[] {
	const stopWords = new Set([
		'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from',
		'how', 'i', 'in', 'into', 'is', 'it', 'make', 'me', 'my', 'of', 'on', 'or',
		'please', 'the', 'this', 'to', 'update', 'use', 'with'
	]);

	return Array.from(new Set(
		rawPrompt
			.toLowerCase()
			.split(/[^a-z0-9_]+/)
			.map(word => word.trim())
			.filter(word => word.length > 2 && !stopWords.has(word))
	));
}

function scoreFile(uri: vscode.Uri, keywords: string[], activeFileName: string): number {
	const relativePath = vscode.workspace.asRelativePath(uri).toLowerCase();
	const normalizedPath = relativePath.replace(/[_\-./\\]+/g, ' ');
	let score = uri.fsPath === activeFileName ? 1 : 0;

	for (const keyword of keywords) {
		if (relativePath.includes(keyword)) {
			score += 4;
		}

		if (normalizedPath.includes(keyword)) {
			score += 2;
		}
	}

	if (/\b(component|components|widget|widgets|page|pages|screen|screens|view|views|feature|features|service|services|controller|provider|store|route|router)\b/.test(normalizedPath)) {
		score += 1;
	}

	return score;
}

function collectRelevantDiagnostics(activeFileName: string, relatedFiles: ContextFile[]): ContextDiagnostic[] {
	const relatedFileNames = new Set(relatedFiles.map(file => file.fileName));
	const allDiagnostics = vscode.languages.getDiagnostics();

	return allDiagnostics
		.flatMap(([uri, diagnostics]) => diagnostics.map(diagnostic => ({
			uri,
			diagnostic,
			priority: getDiagnosticPriority(uri.fsPath, activeFileName, relatedFileNames)
		})))
		.filter(item => item.priority > 0)
		.sort((left, right) => {
			if (right.priority !== left.priority) {
				return right.priority - left.priority;
			}

			return left.diagnostic.severity - right.diagnostic.severity;
		})
		.slice(0, 20)
		.map(({ uri, diagnostic }) => ({
			fileName: uri.fsPath,
			line: diagnostic.range.start.line + 1,
			column: diagnostic.range.start.character + 1,
			severity: formatSeverity(diagnostic.severity),
			message: diagnostic.message,
			source: diagnostic.source
		}));
}

function getDiagnosticPriority(fileName: string, activeFileName: string, relatedFileNames: Set<string>): number {
	if (fileName === activeFileName) {
		return 3;
	}

	if (relatedFileNames.has(fileName)) {
		return 2;
	}

	return 1;
}

function formatSeverity(severity: vscode.DiagnosticSeverity): string {
	switch (severity) {
		case vscode.DiagnosticSeverity.Error:
			return 'error';
		case vscode.DiagnosticSeverity.Warning:
			return 'warning';
		case vscode.DiagnosticSeverity.Information:
			return 'info';
		case vscode.DiagnosticSeverity.Hint:
			return 'hint';
	}
}
