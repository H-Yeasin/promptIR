import * as vscode from 'vscode';
import type { ContextStrategy } from '../presets/presetTypes';
import { truncateContext } from './contextText';
import type { ContextDiagnostic, ContextFile } from './contextTypes';

export async function readDiagnosticFiles(diagnostics: ContextDiagnostic[], activeFileName: string): Promise<ContextFile[]> {
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

export function collectRelevantDiagnostics(
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

export function getDiagnosticPriority(
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

export function formatSeverity(severity: vscode.DiagnosticSeverity): string {
	switch (severity) {
		case vscode.DiagnosticSeverity.Error:
			return 'error';
		case vscode.DiagnosticSeverity.Warning:
			return 'warning';
		case vscode.DiagnosticSeverity.Information:
			return 'info';
		case vscode.DiagnosticSeverity.Hint:
			return 'hint';
		default:
			return 'unknown';
	}
}
