import * as vscode from 'vscode';
import type { ContextStrategy } from '../presets/presetTypes';
import { extractKeywords, scoreFile, scoreSummaryFile } from './keywordScoring';
import { truncateContext } from './contextText';
import type { ContextFile } from './contextTypes';

export async function findRelevantWorkspaceFiles(
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
	return readContextFiles(ranked, maxChars);
}

export async function findWorkspaceSummaryFiles(
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
		.filter(candidate => candidate.score > 0)
		.sort((left, right) => right.score - left.score)
		.slice(0, limit);

	return readContextFiles(ranked, 3000);
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
