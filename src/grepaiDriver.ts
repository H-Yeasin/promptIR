import * as path from 'path';
import * as vscode from 'vscode';
import { execWithTimeout } from './utils/execWithTimeout';

export type GrepaiStatus = 'ready' | 'no-binary' | 'no-index' | 'provider-down' | 'disabled';

export interface GrepaiHit {
	file: string;
	startLine: number;
	endLine: number;
	score: number;
}

interface GrepaiSearchOptions {
	maxResults: number;
	cwd: string;
	timeoutMs?: number;
}

const PROBE_TIMEOUT_MS = 3000;
const DEFAULT_SEARCH_TIMEOUT_MS = 10000;
const SETUP_HINT_SHOWN_KEY = 'promptir.grepai.setupHintShown';
const GREPAI_INSTALL_URL = 'https://yoanbernabeu.github.io/grepai/installation/';

let extensionContext: vscode.ExtensionContext | undefined;
let cachedStatus: GrepaiStatus | undefined;
let setupHintShownThisSession = false;

export function initGrepaiDriver(context: vscode.ExtensionContext): void {
	extensionContext = context;
}

export class GrepaiDriver {
	async detectGrepai(): Promise<GrepaiStatus> {
		if (!isGrepaiEnabled()) {
			cachedStatus = 'disabled';
			return cachedStatus;
		}

		if (cachedStatus === 'ready') {
			return cachedStatus;
		}

		cachedStatus = await computeGrepaiStatus();
		return cachedStatus;
	}

	async semanticSearch(query: string, opts: GrepaiSearchOptions): Promise<GrepaiHit[] | null> {
		if (!isGrepaiEnabled()) {
			return null;
		}

		try {
			const stdout = await runGrepaiSearch(query, opts.maxResults, opts.cwd, opts.timeoutMs ?? DEFAULT_SEARCH_TIMEOUT_MS);
			return parseGrepaiHits(stdout, opts.cwd);
		} catch {
			return null;
		}
	}

	/**
	 * grepai has no pip/npm distribution and no single cross-platform install
	 * command PromptIR can safely auto-run, so "installing" it means sending the
	 * user to grepai's own official installation guide.
	 */
	async openInstallGuide(): Promise<void> {
		await vscode.env.openExternal(vscode.Uri.parse(GREPAI_INSTALL_URL));
	}
}

function isGrepaiEnabled(): boolean {
	return vscode.workspace.getConfiguration('promptir').get<boolean>('grepai.enabled', true);
}

function getWorkspaceRoot(): string | undefined {
	return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function computeGrepaiStatus(): Promise<GrepaiStatus> {
	const workspaceRoot = getWorkspaceRoot();

	if (!workspaceRoot) {
		return 'no-index';
	}

	const hasBinary = await isGrepaiOnPath(workspaceRoot);

	if (!hasBinary) {
		void maybeShowSetupHint();
		return 'no-binary';
	}

	const hasIndex = await pathExists(path.join(workspaceRoot, '.grepai'));

	if (!hasIndex) {
		return 'no-index';
	}

	try {
		const stdout = await runGrepaiSearch('test', 1, workspaceRoot, PROBE_TIMEOUT_MS);
		return parseGrepaiHits(stdout, workspaceRoot) !== null ? 'ready' : 'provider-down';
	} catch {
		return 'provider-down';
	}
}

async function isGrepaiOnPath(cwd: string): Promise<boolean> {
	try {
		await execWithTimeout('grepai', ['--help'], { cwd, timeoutMs: PROBE_TIMEOUT_MS });
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code !== 'ENOENT';
	}
}

function runGrepaiSearch(query: string, maxResults: number, cwd: string, timeoutMs: number): Promise<string> {
	return execWithTimeout('grepai', ['search', query, '--json', '--compact', '-n', String(maxResults)], { cwd, timeoutMs });
}

export function parseGrepaiHits(stdout: string, workspaceRoot: string): GrepaiHit[] | null {
	const trimmed = stdout.trim();

	if (!trimmed) {
		return [];
	}

	let parsed: unknown;

	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return null;
	}

	const rawHits = extractRawHits(parsed);

	if (!rawHits) {
		return null;
	}

	const hits: GrepaiHit[] = [];

	for (const rawHit of rawHits) {
		const hit = normalizeGrepaiHit(rawHit, workspaceRoot);

		if (hit) {
			hits.push(hit);
		}
	}

	return hits;
}

function extractRawHits(parsed: unknown): unknown[] | undefined {
	if (Array.isArray(parsed)) {
		return parsed as unknown[];
	}

	if (isRecord(parsed)) {
		const candidate = parsed.results ?? parsed.hits ?? parsed.matches ?? parsed.items;

		if (Array.isArray(candidate)) {
			return candidate as unknown[];
		}
	}

	return undefined;
}

function normalizeGrepaiHit(rawHit: unknown, workspaceRoot: string): GrepaiHit | undefined {
	if (!isRecord(rawHit)) {
		return undefined;
	}

	const file = rawHit.file ?? rawHit.path ?? rawHit.filepath ?? rawHit.filePath;

	if (typeof file !== 'string' || !file.trim()) {
		return undefined;
	}

	const startLine = toLineNumber(rawHit.startLine ?? rawHit.start_line ?? rawHit.line ?? rawHit.lineStart);

	if (startLine === undefined) {
		return undefined;
	}

	const endLine = toLineNumber(rawHit.endLine ?? rawHit.end_line ?? rawHit.lineEnd) ?? startLine;
	const rawScore = rawHit.score ?? rawHit.relevance ?? rawHit.similarity;
	const score = typeof rawScore === 'number' ? rawScore : Number(rawScore) || 0;

	return {
		file: path.isAbsolute(file) ? file : path.join(workspaceRoot, file),
		startLine,
		endLine,
		score
	};
}

function toLineNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
		return Number(value);
	}

	return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
		return true;
	} catch {
		return false;
	}
}

async function maybeShowSetupHint(): Promise<void> {
	if (setupHintShownThisSession) {
		return;
	}

	setupHintShownThisSession = true;

	if (extensionContext?.globalState.get<boolean>(SETUP_HINT_SHOWN_KEY, false)) {
		return;
	}

	const learnMoreAction = 'Learn More';
	const dontShowAgainAction = "Don't Show Again";
	const selection = await vscode.window.showWarningMessage(
		'PromptIR can use grepai for faster, more relevant semantic code search when preparing prompts. Install grepai to enable it; PromptIR works fine without it.',
		learnMoreAction,
		dontShowAgainAction
	);

	if (selection === learnMoreAction) {
		await vscode.env.openExternal(vscode.Uri.parse(GREPAI_INSTALL_URL));
		return;
	}

	if (selection === dontShowAgainAction) {
		await extensionContext?.globalState.update(SETUP_HINT_SHOWN_KEY, true);
	}
}
