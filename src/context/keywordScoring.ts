import * as vscode from 'vscode';

export function extractKeywords(rawPrompt: string): string[] {
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

export function scoreFile(uri: vscode.Uri, keywords: string[], activeFileName: string): number {
	const relativePath = vscode.workspace.asRelativePath(uri).toLowerCase();
	const normalizedPath = relativePath.replace(/[_\-./\\]+/g, ' ');
	let score = uri.fsPath === activeFileName ? 1 : 0;

	for (const keyword of keywords) {
		const keywordPattern = new RegExp(`\\b${keyword}\\b`);

		if (keywordPattern.test(relativePath)) {
			score += 4;
		}

		if (keywordPattern.test(normalizedPath)) {
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

export function scoreSummaryFile(uri: vscode.Uri, keywords: string[], activeFileName: string): number {
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
		if (new RegExp(`\\b${keyword}\\b`).test(relativePath)) {
			score += 3;
		}
	}

	return score;
}
