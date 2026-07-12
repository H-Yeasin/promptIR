import * as vscode from 'vscode';
import { getActiveEditorContext } from '../../context/contextGatherer';
import { GraphifyDriver } from '../../graphifyDriver';
import { installGraphifyFromSidebar } from '../../graphifyInstall';
import { GrepaiDriver, type GrepaiStatus } from '../../grepaiDriver';
import { OllamaDriver, type OllamaStatus } from '../../ollamaDriver';
import { runPresetPipeline } from '../../pipeline/runPresetPipeline';
import { getPromptPreset } from '../../presets/promptPresets';
import { setOpenAiApiKey } from '../../secrets';
import { composeFollowUpRefinementPrompt } from '../composer/followUpRefinement';
import type { FollowUpAnswer } from '../composer/composerTypes';

export type SidebarMessage =
	| { type: 'generate'; presetId: string; prompt: string }
	| { type: 'refineFromFollowUp'; originalPrompt: string; answers: FollowUpAnswer[] }
	| { type: 'copy'; text: string }
	| { type: 'saveSettings'; aiProvider: string; openaiApiKey: string }
	| { type: 'requestToolStatus' }
	| { type: 'installGraphify' }
	| { type: 'installGrepai' }
	| { type: 'installOllama' };

export async function handleGenerate(webviewView: vscode.WebviewView, message: SidebarMessage): Promise<void> {
		if (message.type !== 'generate') {
			return;
		}

		const workspaceContext = getActiveEditorContext();

		if (!workspaceContext) {
			await webviewView.webview.postMessage({
				type: 'error',
				message: 'Open a file before using PromptIR.'
			});
			return;
		}

		const preset = getPromptPreset(message.presetId);
		const rawPrompt = message.prompt.trim();

		if (preset.requiresPrompt && !rawPrompt) {
			await webviewView.webview.postMessage({
				type: 'error',
				message: `${preset.label} needs input before PromptIR can continue.`
			});
			return;
		}

		await webviewView.webview.postMessage({
			type: 'generationStarted',
			label: preset.label
		});

		try {
			const generatedPrompt = await runPresetPipeline(rawPrompt, workspaceContext, preset, {
				onFragment: fragment => {
					void webviewView.webview.postMessage({
						type: 'fragment',
						fragment
					});
				}
			});

			const shouldCopy = preset.id !== 'askFollowUpQuestions';

			if (shouldCopy) {
				await vscode.env.clipboard.writeText(generatedPrompt);
			}

			await webviewView.webview.postMessage({
				type: 'complete',
				prompt: generatedPrompt,
				presetId: preset.id,
				copied: shouldCopy
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unable to generate prompt.';

			await webviewView.webview.postMessage({
				type: 'error',
				message: errorMessage
			});
		}
	}

export async function handleRefineFromFollowUp(webviewView: vscode.WebviewView, message: SidebarMessage): Promise<void> {
		if (message.type !== 'refineFromFollowUp') {
			return;
		}

		const workspaceContext = getActiveEditorContext();

		if (!workspaceContext) {
			await webviewView.webview.postMessage({
				type: 'error',
				message: 'Open a file before PromptIR can refine the follow-up answers.'
			});
			return;
		}

		const preset = getPromptPreset('optimize');
		const refinedPrompt = composeFollowUpRefinementPrompt(message.originalPrompt, message.answers);

		await webviewView.webview.postMessage({
			type: 'generationStarted',
			label: preset.label
		});

		try {
			const generatedPrompt = await runPresetPipeline(refinedPrompt, workspaceContext, preset, {
				onFragment: fragment => {
					void webviewView.webview.postMessage({
						type: 'fragment',
						fragment
					});
				}
			});

			await vscode.env.clipboard.writeText(generatedPrompt);
			await webviewView.webview.postMessage({
				type: 'complete',
				prompt: generatedPrompt,
				presetId: preset.id,
				copied: true
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unable to refine the follow-up answers.';

			await webviewView.webview.postMessage({
				type: 'error',
				message: errorMessage
			});
		}
	}

export async function handleSaveSettings(webviewView: vscode.WebviewView, message: SidebarMessage): Promise<void> {
	if (message.type !== 'saveSettings') {
		return;
	}

	const config = vscode.workspace.getConfiguration('promptir');
	await config.update('aiProvider', message.aiProvider, vscode.ConfigurationTarget.Global);
	await setOpenAiApiKey(message.openaiApiKey);

	await webviewView.webview.postMessage({
		type: 'settingsSaved'
	});
}

export async function postToolStatus(
	webviewView: vscode.WebviewView,
	graphifyDriver: GraphifyDriver,
	grepaiDriver: GrepaiDriver,
	ollamaDriver: OllamaDriver
): Promise<void> {
	const graphifyInstalled = await graphifyDriver.checkInstallation().catch(() => false);
	const grepaiStatus = await grepaiDriver.detectGrepai().catch<GrepaiStatus>(() => 'no-binary');
	const ollamaStatus = await ollamaDriver.detectOllama().catch<OllamaStatus>(() => 'not-installed');

	await webviewView.webview.postMessage({ type: 'toolStatus', tool: 'graphify', installed: graphifyInstalled });
	await webviewView.webview.postMessage({ type: 'toolStatus', tool: 'grepai', status: grepaiStatus });
	await webviewView.webview.postMessage({ type: 'toolStatus', tool: 'ollama', status: ollamaStatus });
}

export async function handleInstallGraphify(webviewView: vscode.WebviewView, graphifyDriver: GraphifyDriver): Promise<void> {
	await webviewView.webview.postMessage({ type: 'toolInstallStarted', tool: 'graphify' });

	const result = await installGraphifyFromSidebar(graphifyDriver);
	const installed = await graphifyDriver.checkInstallation().catch(() => false);

	await webviewView.webview.postMessage({
		type: 'toolInstallResult',
		tool: 'graphify',
		ok: result.ok,
		installed,
		message: result.error
	});
}

export async function handleInstallGrepai(webviewView: vscode.WebviewView, grepaiDriver: GrepaiDriver): Promise<void> {
	await webviewView.webview.postMessage({ type: 'toolInstallStarted', tool: 'grepai' });

	await grepaiDriver.openInstallGuide();
	const status = await grepaiDriver.detectGrepai().catch<GrepaiStatus>(() => 'no-binary');

	await webviewView.webview.postMessage({
		type: 'toolInstallResult',
		tool: 'grepai',
		ok: true,
		status,
		message: 'Opened grepai\'s installation guide in your browser.'
	});
}

export async function handleInstallOllama(webviewView: vscode.WebviewView, ollamaDriver: OllamaDriver): Promise<void> {
	await webviewView.webview.postMessage({ type: 'toolInstallStarted', tool: 'ollama' });

	await ollamaDriver.openInstallGuide();
	const status = await ollamaDriver.detectOllama().catch<OllamaStatus>(() => 'not-installed');

	await webviewView.webview.postMessage({
		type: 'toolInstallResult',
		tool: 'ollama',
		ok: true,
		status,
		message: 'Opened Ollama\'s download page in your browser.'
	});
}
