import * as path from 'path';
import * as vscode from 'vscode';
import { GraphifyDriver } from '../graphifyDriver';
import { ensureGraphifyInstalled } from '../graphifyInstall';

const AUTO_REINDEX_WARNING_SHOWN_KEY = 'promptir.teamHooks.autoReindexWarningShown';

export function registerInstallTeamHooksCommand(
	graphifyDriver: GraphifyDriver,
	context: vscode.ExtensionContext
): vscode.Disposable {
	return vscode.commands.registerCommand('promptir.installTeamHooks', async () => {
		const installed = await ensureGraphifyInstalled(graphifyDriver);

		if (!installed) {
			return;
		}

		const result = await graphifyDriver.installHooks();

		if (!result.ok) {
			vscode.window.showWarningMessage(`PromptIR could not install Graphify team hooks. ${result.error ?? 'Unknown error.'}`);
			return;
		}

		await ensureGitAttributesEntry(result.output);
		vscode.window.showInformationMessage('Graphify team hooks installed for this repository.');
		await maybeWarnAboutAutoReindex(context);
	});
}

async function ensureGitAttributesEntry(hookInstallOutput: string): Promise<void> {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	const attributeLine = extractGitAttributesLine(hookInstallOutput);

	if (!workspaceRoot || !attributeLine) {
		return;
	}

	const gitAttributesUri = vscode.Uri.file(path.join(workspaceRoot, '.gitattributes'));
	let currentText = '';

	try {
		const bytes = await vscode.workspace.fs.readFile(gitAttributesUri);
		currentText = Buffer.from(bytes).toString('utf8');
	} catch {
		currentText = '';
	}

	if (currentText.split(/\r?\n/).some(line => line.trim() === attributeLine)) {
		return;
	}

	const nextText = `${currentText}${currentText && !currentText.endsWith('\n') ? '\n' : ''}${attributeLine}\n`;
	await vscode.workspace.fs.writeFile(gitAttributesUri, Buffer.from(nextText, 'utf8'));
}

export function extractGitAttributesLine(output: string): string | undefined {
	return output
		.split(/\r?\n/)
		.map(line => line.trim())
		.find(line => /^\S+\s+merge=\S+/.test(line));
}

async function maybeWarnAboutAutoReindex(context: vscode.ExtensionContext): Promise<void> {
	const config = vscode.workspace.getConfiguration('promptir');

	if (!config.get<boolean>('graphify.autoReindex', true)) {
		return;
	}

	if (context.globalState.get<boolean>(AUTO_REINDEX_WARNING_SHOWN_KEY, false)) {
		return;
	}

	await context.globalState.update(AUTO_REINDEX_WARNING_SHOWN_KEY, true);

	const disableAction = 'Disable Auto-Reindex';
	const selection = await vscode.window.showWarningMessage(
		'Graphify team hooks are installed. PromptIR\'s "graphify.autoReindex" setting can cause double index rebuilds alongside the new git hooks. Disable it?',
		disableAction
	);

	if (selection === disableAction) {
		await config.update('graphify.autoReindex', false, vscode.ConfigurationTarget.Workspace);
	}
}
