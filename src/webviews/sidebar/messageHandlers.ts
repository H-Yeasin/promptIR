import * as vscode from 'vscode';
import { getActiveEditorContext } from '../../context/contextGatherer';
import { runPresetPipeline } from '../../pipeline/runPresetPipeline';
import { getPromptPreset } from '../../presets/promptPresets';
import { composeFollowUpRefinementPrompt } from '../composer/followUpRefinement';
import type { FollowUpAnswer } from '../composer/composerTypes';

export type SidebarMessage =
	| { type: 'generate'; presetId: string; prompt: string }
	| { type: 'refineFromFollowUp'; originalPrompt: string; answers: FollowUpAnswer[] }
	| { type: 'copy'; text: string }
	| { type: 'saveSettings'; aiProvider: string; openaiApiKey: string };

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
	await config.update('openaiApiKey', message.openaiApiKey, vscode.ConfigurationTarget.Global);

	await webviewView.webview.postMessage({
		type: 'settingsSaved'
	});
}
