import { spawn } from 'child_process';
import * as vscode from 'vscode';
import { registerChatParticipant } from './chat/chatParticipant';
import { registerCopyCommand } from './commands/copyCommand';
import { registerOptimizeCommand } from './commands/optimizeCommand';
import { GraphifyDriver } from './graphifyDriver';
import { registerPromptIRSidebar } from './webviews/sidebar/promptirSidebar';

export function activate(context: vscode.ExtensionContext) {
	const graphifyDriver = new GraphifyDriver();
	const graphifyStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	const autoReindex = vscode.workspace.getConfiguration('promptir').get<boolean>('graphify.autoReindex', true);

	context.subscriptions.push(
		graphifyStatusItem,
		registerOptimizeCommand(context.extensionUri),
		registerCopyCommand(),
		registerChatParticipant(),
		...registerPromptIRSidebar(context.extensionUri)
	);

	graphifyStatusItem.show();
	void refreshGraphifyStatus(graphifyDriver, graphifyStatusItem);
	void ensureGraphifyInstalled(graphifyDriver).then(() => refreshGraphifyStatus(graphifyDriver, graphifyStatusItem));

	if (autoReindex) {
		context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
			void graphifyDriver.checkInstallation()
				.then(installed => installed ? graphifyDriver.updateGraph() : undefined)
				.then(() => refreshGraphifyStatus(graphifyDriver, graphifyStatusItem))
				.catch(() => undefined);
		}));
	}
}

export function deactivate() {}

async function ensureGraphifyInstalled(driver: GraphifyDriver): Promise<boolean> {
	if (await driver.checkInstallation()) {
		return true;
	}

	const installAction = 'Install Automatically (via Pip)';
	const learnMoreAction = 'Learn More';
	const selection = await vscode.window.showWarningMessage(
		'PromptIR requires Graphify to build a codebase relationship map. Would you like to install it automatically?',
		installAction,
		learnMoreAction
	);

	if (selection === learnMoreAction) {
		await vscode.env.openExternal(vscode.Uri.parse('https://github.com/Graphify-Labs/graphify'));
		return false;
	}

	if (selection !== installAction) {
		return false;
	}

	try {
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Installing codebase graph dependencies...',
				cancellable: false
			},
			async progress => {
				await installGraphify(progress);
				progress.report({ message: 'Building initial relationship map...' });
				await driver.checkInstallation();
				await driver.buildGraph();
			}
		);

		vscode.window.showInformationMessage('Graphify installed. PromptIR is building the initial relationship map.');
		return true;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown installation error.';
		vscode.window.showWarningMessage(`PromptIR could not install Graphify automatically. ${message}`);
		return false;
	}
}

function installGraphify(progress: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn('pip', ['install', 'graphifyy'], {
			cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
			shell: true,
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true
		});

		child.stdout.on('data', chunk => reportInstallOutput(progress, chunk));
		child.stderr.on('data', chunk => reportInstallOutput(progress, chunk));
		child.once('error', reject);
		child.once('close', code => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`pip install graphifyy exited with code ${code}.`));
		});
	});
}

function reportInstallOutput(
	progress: vscode.Progress<{ message?: string; increment?: number }>,
	chunk: Buffer
): void {
	const message = chunk.toString('utf8').split(/\r?\n/).find(line => line.trim())?.trim();

	if (message) {
		progress.report({ message });
	}
}

async function refreshGraphifyStatus(driver: GraphifyDriver, item: vscode.StatusBarItem): Promise<void> {
	const installed = await driver.checkInstallation().catch(() => false);
	const indexed = installed && await driver.hasGraphIndex().catch(() => false);

	item.text = indexed
		? 'Graphify: Indexed $(pass-filled)'
		: installed
			? 'Graphify: Needs Index $(warning)'
			: 'Graphify: Missing $(error)';
	item.tooltip = indexed
		? 'Graphify relationship index is ready for PromptIR.'
		: installed
			? 'Graphify is installed, but graphify-out/graph.json has not been generated yet.'
		: 'Graphify is not available. PromptIR will fall back to file-level context.';
}
