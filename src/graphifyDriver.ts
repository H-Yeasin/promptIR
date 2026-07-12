import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

interface GraphifyRunner {
	command: string;
	argsPrefix: string[];
}

interface GraphifyNode {
	id: string;
	fileName: string;
	cluster?: string | number;
	degree: number;
	raw: Record<string, unknown>;
}

interface GraphifyEdge {
	source: string;
	target: string;
	type?: string;
	raw: Record<string, unknown>;
}

export interface GraphifyRelationshipMap {
	activeFile: string;
	cluster?: string | number;
	degree: number;
	upstream: GraphifyNode[];
	downstream: GraphifyNode[];
	edges: GraphifyEdge[];
}

export class GraphifyDriver {
	private runner?: GraphifyRunner;

	async checkInstallation(): Promise<boolean> {
		const runner = await this.resolveRunner();
		this.runner = runner;

		return Boolean(runner);
	}

	async ensureGraphIndex(): Promise<boolean> {
		await ensureGraphifyOutIgnored();

		if (!await this.checkInstallation()) {
			return false;
		}

		await this.updateGraph().catch(() => undefined);

		if (!await this.hasGraphIndex()) {
			await this.buildGraph().catch(() => undefined);
		}

		return this.hasGraphIndex();
	}

	async hasGraphIndex(): Promise<boolean> {
		return hasGraphIndex();
	}

	async buildGraph(): Promise<void> {
		const workspaceRoot = getWorkspaceRoot();

		if (!workspaceRoot) {
			return;
		}

		const runner = this.runner ?? await this.resolveRunner();

		if (!runner) {
			return;
		}

		this.runner = runner;
		const indexTarget = await getCodeIndexTarget(workspaceRoot);
		await deleteStaleGraph(workspaceRoot);

		await runGraphifyCommand(runner, [
			'extract',
			indexTarget,
			'--no-cluster',
			'--out',
			workspaceRoot,
			'--max-workers',
			'1'
		], workspaceRoot);
	}

	async updateGraph(): Promise<void> {
		const workspaceRoot = getWorkspaceRoot();

		if (!workspaceRoot) {
			return;
		}

		const runner = this.runner ?? await this.resolveRunner();

		if (!runner) {
			return;
		}

		this.runner = runner;
		await runGraphifyCommand(runner, ['update', '.'], workspaceRoot);
	}

	async installHooks(): Promise<{ ok: boolean; output: string; error?: string }> {
		const workspaceRoot = getWorkspaceRoot();

		if (!workspaceRoot) {
			return { ok: false, output: '', error: 'No workspace folder is open.' };
		}

		const runner = this.runner ?? await this.resolveRunner();

		if (!runner) {
			return { ok: false, output: '', error: 'Graphify is not installed.' };
		}

		this.runner = runner;

		try {
			const output = await runGraphifyCommandCapture(runner, ['hook', 'install'], workspaceRoot);
			return { ok: true, output };
		} catch (error) {
			return { ok: false, output: '', error: error instanceof Error ? error.message : 'Unknown error installing Graphify hooks.' };
		}
	}

	async getRelatedContext(activeFileName: string): Promise<GraphifyRelationshipMap | null> {
		const workspaceRoot = getWorkspaceRoot();

		if (!workspaceRoot) {
			return null;
		}

		const graphUri = vscode.Uri.file(path.join(workspaceRoot, 'graphify-out', 'graph.json'));
		const graphText = await readGraphFile(graphUri);
		const graph = JSON.parse(graphText) as Record<string, unknown>;
		const nodes = normalizeNodes(graph);
		const edges = normalizeEdges(graph);
		const activePath = normalizePath(activeFileName);
		const activeNode = nodes.find(node => activePath.includes(normalizePath(node.fileName)) || normalizePath(node.fileName).includes(activePath));

		if (!activeNode) {
			return null;
		}

		const maxDepth = vscode.workspace.getConfiguration('promptir').get<number>('graphify.maxDepth', 5);
		const adjacentEdges = edges.filter(edge => edge.source === activeNode.id || edge.target === activeNode.id);
		const nodeById = new Map(nodes.map(node => [node.id, node]));
		const upstream = adjacentEdges
			.filter(edge => edge.target === activeNode.id)
			.map(edge => nodeById.get(edge.source))
			.filter(isGraphifyNode)
			.slice(0, maxDepth);
		const downstream = adjacentEdges
			.filter(edge => edge.source === activeNode.id)
			.map(edge => nodeById.get(edge.target))
			.filter(isGraphifyNode)
			.slice(0, maxDepth);

		return {
			activeFile: activeNode.fileName,
			cluster: activeNode.cluster,
			degree: activeNode.degree || adjacentEdges.length,
			upstream,
			downstream,
			edges: adjacentEdges.slice(0, maxDepth * 2)
		};
	}

	private async resolveRunner(): Promise<GraphifyRunner | undefined> {
		const runners = getCandidateRunners();

		for (const runner of runners) {
			const found = await canRunGraphify(runner, ['--version']);

			if (found) {
				return runner;
			}
		}

		return undefined;
	}
}

async function readGraphFile(uri: vscode.Uri): Promise<string> {
	const bytes = await vscode.workspace.fs.readFile(uri);

	return Buffer.from(bytes).toString('utf8');
}

function getWorkspaceRoot(): string | undefined {
	return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

async function hasGraphIndex(): Promise<boolean> {
	const workspaceRoot = getWorkspaceRoot();

	if (!workspaceRoot) {
		return false;
	}

	try {
		const stat = await vscode.workspace.fs.stat(vscode.Uri.file(path.join(workspaceRoot, 'graphify-out', 'graph.json')));
		return stat.size > 2;
	} catch {
		return false;
	}
}

async function ensureGraphifyOutIgnored(): Promise<void> {
	const workspaceRoot = getWorkspaceRoot();

	if (!workspaceRoot) {
		return;
	}

	const gitignoreUri = vscode.Uri.file(path.join(workspaceRoot, '.gitignore'));
	let currentText = '';

	try {
		const bytes = await vscode.workspace.fs.readFile(gitignoreUri);
		currentText = Buffer.from(bytes).toString('utf8');
	} catch {
		currentText = '';
	}

	if (currentText.split(/\r?\n/).some(line => line.trim() === 'graphify-out/' || line.trim() === 'graphify-out')) {
		return;
	}

	const nextText = `${currentText}${currentText && !currentText.endsWith('\n') ? '\n' : ''}graphify-out/\n`;
	await vscode.workspace.fs.writeFile(gitignoreUri, Buffer.from(nextText, 'utf8'));
}

async function getCodeIndexTarget(workspaceRoot: string): Promise<string> {
	const preferredRoots = ['lib', 'src', 'app', 'packages', 'test'];

	for (const root of preferredRoots) {
		const candidate = path.join(workspaceRoot, root);

		if (await pathExists(candidate)) {
			return candidate;
		}
	}

	return workspaceRoot;
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
		return true;
	} catch {
		return false;
	}
}

async function deleteStaleGraph(workspaceRoot: string): Promise<void> {
	const graphUri = vscode.Uri.file(path.join(workspaceRoot, 'graphify-out', 'graph.json'));

	try {
		await vscode.workspace.fs.delete(graphUri);
	} catch {
		// Missing graph files are fine; Graphify will create a fresh one.
	}
}

function getCandidateRunners(): GraphifyRunner[] {
	const workspaceRoot = getWorkspaceRoot();
	const runners: GraphifyRunner[] = [
		{ command: 'graphify', argsPrefix: [] },
		{ command: 'npx', argsPrefix: ['--no-install', 'graphify'] },
		{ command: 'python', argsPrefix: ['-m', 'graphify'] },
		{ command: 'python', argsPrefix: ['-m', 'graphifyy'] },
		{ command: 'python3', argsPrefix: ['-m', 'graphify'] },
		{ command: 'python3', argsPrefix: ['-m', 'graphifyy'] },
		{ command: 'py', argsPrefix: ['-m', 'graphify'] },
		{ command: 'py', argsPrefix: ['-m', 'graphifyy'] }
	];

	if (workspaceRoot) {
		runners.unshift(
			{ command: path.join(workspaceRoot, '.venv', 'Scripts', 'graphify.exe'), argsPrefix: [] },
			{ command: path.join(workspaceRoot, 'venv', 'Scripts', 'graphify.exe'), argsPrefix: [] },
			{ command: path.join(workspaceRoot, '.venv', 'bin', 'graphify'), argsPrefix: [] },
			{ command: path.join(workspaceRoot, 'venv', 'bin', 'graphify'), argsPrefix: [] }
		);
	}

	return runners;
}

function canRunGraphify(runner: GraphifyRunner, args: string[]): Promise<boolean> {
	return new Promise(resolve => {
		const child = spawn(runner.command, [...runner.argsPrefix, ...args], {
			cwd: getWorkspaceRoot(),
			shell: true,
			stdio: 'ignore',
			windowsHide: true
		});

		child.once('error', () => resolve(false));
		child.once('close', code => resolve(code === 0));
	});
}

function runGraphifyCommand(runner: GraphifyRunner, args: string[], cwd: string): Promise<void> {
	return runGraphifyCommandCapture(runner, args, cwd).then(() => undefined);
}

function runGraphifyCommandCapture(runner: GraphifyRunner, args: string[], cwd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		let stdout = '';
		let stderr = '';
		const child = spawn(runner.command, [...runner.argsPrefix, ...args], {
			cwd,
			shell: true,
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true
		});

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString('utf8');
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString('utf8');
		});
		child.once('error', reject);
		child.once('close', code => {
			if (code === 0) {
				resolve(stdout);
				return;
			}

			reject(new Error(stderr.trim() || stdout.trim() || `Graphify exited with code ${code}.`));
		});
	});
}

function normalizeNodes(graph: Record<string, unknown>): GraphifyNode[] {
	const rawNodes = graph.nodes ?? graph.vertices ?? graph.files ?? [];
	const entries = Array.isArray(rawNodes)
		? rawNodes
		: Object.entries(rawNodes as Record<string, unknown>).map(([id, value]) => ({ id, ...(isRecord(value) ? value : {}) }));

	return entries
		.filter(isRecord)
		.map((node, index) => {
			const id = stringify(node.id ?? node.key ?? node.name ?? node.path ?? node.file ?? index);
			const fileName = stringify(node.fileName ?? node.file ?? node.path ?? node.label ?? node.name ?? id);

			return {
				id,
				fileName,
				cluster: readCluster(node),
				degree: readDegree(node),
				raw: node
			};
		});
}

function normalizeEdges(graph: Record<string, unknown>): GraphifyEdge[] {
	const rawEdges = graph.edges ?? graph.links ?? graph.dependencies ?? [];

	if (!Array.isArray(rawEdges)) {
		return [];
	}

	return rawEdges
		.filter(isRecord)
		.map(edge => ({
			source: stringify(edge.source ?? edge.from ?? edge.parent ?? edge.caller ?? ''),
			target: stringify(edge.target ?? edge.to ?? edge.child ?? edge.callee ?? ''),
			type: typeof edge.type === 'string' ? edge.type : undefined,
			raw: edge
		}))
		.filter(edge => edge.source && edge.target);
}

function readCluster(node: Record<string, unknown>): string | number | undefined {
	const cluster = node.cluster ?? node.clusterId ?? node.community;

	return typeof cluster === 'string' || typeof cluster === 'number' ? cluster : undefined;
}

function readDegree(node: Record<string, unknown>): number {
	const degree = node.degree ?? node.degreeScore ?? node.score;

	return typeof degree === 'number' ? degree : 0;
}

function normalizePath(filePath: string): string {
	return filePath.replace(/\\/g, '/').toLowerCase();
}

function stringify(value: unknown): string {
	return typeof value === 'string' ? value : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isGraphifyNode(value: GraphifyNode | undefined): value is GraphifyNode {
	return Boolean(value);
}
