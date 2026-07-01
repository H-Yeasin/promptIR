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

export function truncateContext(text: string, maxChars = 8000): string {
	if (text.length <= maxChars) {
		return text;
	}

	return `${text.slice(0, maxChars).trimEnd()}\n\n[PromptIR truncated this context at ${maxChars} characters.]`;
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

	const maxChars = contextStrategy === 'activeFileAndRelatedFiles' ? 4000 : 6000;
	const relatedFiles: ContextFile[] = [];

	for (const candidate of ranked) {
		try {
			const document = await vscode.workspace.openTextDocument(candidate.uri);
			const text = document.getText();

			relatedFiles.push({
				fileName: document.fileName,
				languageId: document.languageId,
				text: truncateContext(text, maxChars),
				score: candidate.score
			});
		} catch {
			// Ignore files VS Code cannot open as text.
		}
	}

	return relatedFiles;
}

async function findWorkspaceSummaryFiles(
	rawPrompt: string,
	activeFileName: string,
	limit = 8
): Promise<ContextFile[]> {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders?.length) {
		return [];
	}

	const files = await vscode.workspace.findFiles(
		'{README.md,package.json,pubspec.yaml,pyproject.toml,Cargo.toml,go.mod,composer.json,requirements.txt,tsconfig.json,vite.config.*,next.config.*,src/main.*,src/index.*,src/App.*,src/app.*,lib/main.dart}',
		'**/{node_modules,.git,dist,build,out,coverage,.dart_tool,ios,android,windows,macos,linux}/**',
		80
	);
	const keywords = extractKeywords(rawPrompt);
	const ranked = files
		.map(uri => ({
			uri,
			score: scoreSummaryFile(uri, keywords, activeFileName)
		}))
		.sort((left, right) => right.score - left.score)
		.slice(0, limit);

	return readContextFiles(ranked, 3000);
}

function mergeContextFiles(files: ContextFile[]): ContextFile[] {
	const byName = new Map<string, ContextFile>();

	for (const file of files) {
		const existing = byName.get(file.fileName);

		if (!existing || file.score > existing.score) {
			byName.set(file.fileName, file);
		}
	}

	return Array.from(byName.values())
		.sort((left, right) => right.score - left.score)
		.slice(0, 8);
}

async function readContextFiles(candidates: { uri: vscode.Uri; score: number }[], maxChars = 6000): Promise<ContextFile[]> {
	const relatedFiles: ContextFile[] = [];

	for (const candidate of candidates) {
		try {
			const document = await vscode.workspace.openTextDocument(candidate.uri);
			const text = document.getText();

			relatedFiles.push({
				fileName: document.fileName,
				languageId: document.languageId,
				text: truncateContext(text, maxChars),
				score: candidate.score
			});
		} catch {
			// Ignore files VS Code cannot open as text.
		}
	}

	return relatedFiles;
}

async function readDiagnosticFiles(diagnostics: ContextDiagnostic[], activeFileName: string): Promise<ContextFile[]> {
	const diagnosticsByFile = new Map<string, ContextDiagnostic[]>();

	for (const diagnostic of diagnostics) {
		if (diagnostic.fileName === activeFileName) {
			continue;
		}

		const fileDiagnostics = diagnosticsByFile.get(diagnostic.fileName) ?? [];
		fileDiagnostics.push(diagnostic);
		diagnosticsByFile.set(diagnostic.fileName, fileDiagnostics);
	}

	const fileDiagnostics = Array.from(diagnosticsByFile.entries()).slice(0, 5);

	const relatedFiles: ContextFile[] = [];

	for (const [fileName, diagnosticsForFile] of fileDiagnostics) {
		try {
			const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fileName));
			const text = buildDiagnosticAdjacentSnippet(document, diagnosticsForFile);

			relatedFiles.push({
				fileName: document.fileName,
				languageId: document.languageId,
				text: truncateContext(text, 5000),
				score: 10
			});
		} catch {
			// Ignore diagnostic files VS Code cannot open as text.
		}
	}

	return relatedFiles;
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

function buildDiagnosticAdjacentSnippet(
	document: vscode.TextDocument,
	diagnostics: ContextDiagnostic[]
): string {
	const snippets: string[] = [];
	const sortedDiagnostics = diagnostics
		.sort((left, right) => left.line - right.line)
		.slice(0, 5);

	for (const diagnostic of sortedDiagnostics) {
		const diagnosticLine = diagnostic.line - 1;
		const startLine = Math.max(0, diagnosticLine - 5);
		const endLine = Math.min(document.lineCount - 1, diagnosticLine + 5);
		const lines: string[] = [];

		for (let line = startLine; line <= endLine; line++) {
			const marker = line === diagnosticLine ? '>' : ' ';
			lines.push(`${marker} ${line + 1}: ${document.lineAt(line).text}`);
		}

		snippets.push([
			`Diagnostic at ${diagnostic.line}:${diagnostic.column} (${diagnostic.severity})`,
			diagnostic.source ? `Source: ${diagnostic.source}` : undefined,
			`Message: ${diagnostic.message}`,
			'Adjacent code:',
			lines.join('\n')
		].filter(Boolean).join('\n'));
	}

	return snippets.join('\n\n---\n\n');
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

	if (/\b(style|styles|theme|themes|css|scss|tailwind|layout|layouts|design|ui|ux)\b/.test(normalizedPath)) {
		score += 1;
	}

	if (/\b(auth|session|token|secret|credential|password|permission|policy|guard|middleware|api|database|db|query|cache|worker|queue|async|stream|upload|download|file|network|crypto|security|performance|perf)\b/.test(normalizedPath)) {
		score += 1;
	}

	if (/\b(test|tests|spec|benchmark|bench)\b/.test(normalizedPath)) {
		score += 1;
	}

	return score;
}

function scoreSummaryFile(uri: vscode.Uri, keywords: string[], activeFileName: string): number {
	const relativePath = vscode.workspace.asRelativePath(uri).toLowerCase();
	const normalizedPath = relativePath.replace(/[_\-./\\]+/g, ' ');
	let score = uri.fsPath === activeFileName ? 8 : 0;

	if (/^(readme\.md|package\.json|pubspec\.yaml|pyproject\.toml|cargo\.toml|go\.mod|composer\.json|requirements\.txt)$/.test(relativePath)) {
		score += 10;
	}

	if (/(^|\/)(src|lib)\/(main|index|app)\./.test(relativePath)) {
		score += 7;
	}

	if (/\b(config|router|route|routes|layout|theme|provider|store)\b/.test(normalizedPath)) {
		score += 3;
	}

	for (const keyword of keywords) {
		if (relativePath.includes(keyword)) {
			score += 3;
		}
	}

	return score;
}

function collectRelevantDiagnostics(
	activeFileName: string,
	relatedFiles: ContextFile[],
	contextStrategy: ContextStrategy
): ContextDiagnostic[] {
	const relatedFileNames = new Set(relatedFiles.map(file => file.fileName));
	const allDiagnostics = vscode.languages.getDiagnostics();

	return allDiagnostics
		.flatMap(([uri, diagnostics]) => diagnostics.map(diagnostic => ({
			uri,
			diagnostic,
			priority: getDiagnosticPriority(uri.fsPath, activeFileName, relatedFileNames, contextStrategy)
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

function getDiagnosticPriority(
	fileName: string,
	activeFileName: string,
	relatedFileNames: Set<string>,
	contextStrategy: ContextStrategy
): number {
	if (fileName === activeFileName) {
		return contextStrategy === 'diagnosticsFocused' ? 4 : 3;
	}

	if (relatedFileNames.has(fileName)) {
		return contextStrategy === 'diagnosticsFocused' ? 3 : 2;
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
