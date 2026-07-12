import * as vscode from 'vscode';
import { registerChatParticipant } from './chat/chatParticipant';
import { registerCopyCommand } from './commands/copyCommand';
import { registerInstallTeamHooksCommand } from './commands/installTeamHooksCommand';
import { registerOptimizeCommand } from './commands/optimizeCommand';
import { GraphifyDriver } from './graphifyDriver';
import { ensureGraphifyInstalled } from './graphifyInstall';
import { GrepaiDriver, GrepaiStatus, initGrepaiDriver } from './grepaiDriver';
import { initSecrets, migrateOpenAiApiKeyFromSettings } from './secrets';
import { registerPromptIRSidebar } from './webviews/sidebar/promptirSidebar';

export function activate(context: vscode.ExtensionContext) {
	initSecrets(context);
	initGrepaiDriver(context);
	void migrateOpenAiApiKeyFromSettings();

	const graphifyDriver = new GraphifyDriver();
	const grepaiDriver = new GrepaiDriver();
	const graphifyStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	const grepaiStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
	const autoReindex = vscode.workspace.getConfiguration('promptir').get<boolean>('graphify.autoReindex', true);

	context.subscriptions.push(
		graphifyStatusItem,
		grepaiStatusItem,
		registerOptimizeCommand(context.extensionUri),
		registerCopyCommand(),
		registerChatParticipant(),
		registerInstallTeamHooksCommand(graphifyDriver, context),
		...registerPromptIRSidebar(context.extensionUri)
	);

	graphifyStatusItem.show();
	grepaiStatusItem.show();
	void refreshGraphifyStatus(graphifyDriver, graphifyStatusItem);
	void refreshGrepaiStatus(grepaiDriver, grepaiStatusItem);
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

async function refreshGrepaiStatus(driver: GrepaiDriver, item: vscode.StatusBarItem): Promise<void> {
	const status = await driver.detectGrepai().catch<GrepaiStatus>(() => 'no-binary');

	item.text = grepaiStatusText(status);
	item.tooltip = grepaiStatusTooltip(status);
}

function grepaiStatusText(status: GrepaiStatus): string {
	switch (status) {
		case 'ready':
			return 'Semantic: Ready $(pass-filled)';
		case 'no-index':
		case 'provider-down':
			return 'Semantic: No Index $(warning)';
		default:
			return 'Semantic: Off $(circle-slash)';
	}
}

function grepaiStatusTooltip(status: GrepaiStatus): string {
	switch (status) {
		case 'ready':
			return 'grepai semantic search is ready for PromptIR.';
		case 'no-index':
			return 'grepai is installed, but no .grepai index was found in this workspace. Run "grepai init" to enable semantic search.';
		case 'provider-down':
			return 'grepai is installed, but its embedding provider (e.g. Ollama) did not respond. PromptIR will fall back to keyword search.';
		case 'disabled':
			return 'Semantic search is disabled in PromptIR settings (promptir.grepai.enabled).';
		default:
			return 'grepai is not installed. PromptIR will fall back to keyword-based file search.';
	}
}
