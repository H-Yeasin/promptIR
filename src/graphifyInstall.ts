import { spawn } from 'child_process';
import * as vscode from 'vscode';
import { GraphifyDriver } from './graphifyDriver';

export async function ensureGraphifyInstalled(driver: GraphifyDriver): Promise<boolean> {
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
			progress => performGraphifyInstall(driver, progress)
		);

		vscode.window.showInformationMessage('Graphify installed. PromptIR is building the initial relationship map.');
		return true;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown installation error.';
		vscode.window.showWarningMessage(`PromptIR could not install Graphify automatically. ${message}`);
		return false;
	}
}

/**
 * Runs the same install-then-build flow as {@link ensureGraphifyInstalled}, but
 * without its confirmation dialog. Used for surfaces (like the sidebar CTA) where
 * clicking "Install" already is the user's confirmation.
 */
export async function installGraphifyFromSidebar(
	driver: GraphifyDriver,
	progress?: vscode.Progress<{ message?: string; increment?: number }>
): Promise<{ ok: boolean; error?: string }> {
	if (await driver.checkInstallation()) {
		return { ok: true };
	}

	try {
		await performGraphifyInstall(driver, progress);
		return { ok: true };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'Unknown installation error.' };
	}
}

async function performGraphifyInstall(
	driver: GraphifyDriver,
	progress?: vscode.Progress<{ message?: string; increment?: number }>
): Promise<void> {
	await installGraphify(progress);
	progress?.report({ message: 'Building initial relationship map...' });
	await driver.checkInstallation();
	await driver.buildGraph();
}

function installGraphify(progress?: vscode.Progress<{ message?: string; increment?: number }>): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn('pip', ['install', 'graphifyy'], {
			cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
			shell: true,
			stdio: ['ignore', 'pipe', 'pipe'],
			windowsHide: true
		});

		child.stdout.on('data', (chunk: Buffer) => reportInstallOutput(progress, chunk));
		child.stderr.on('data', (chunk: Buffer) => reportInstallOutput(progress, chunk));
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
	progress: vscode.Progress<{ message?: string; increment?: number }> | undefined,
	chunk: Buffer
): void {
	const message = chunk.toString('utf8').split(/\r?\n/).find(line => line.trim())?.trim();

	if (message) {
		progress?.report({ message });
	}
}
