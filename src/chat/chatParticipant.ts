import * as vscode from 'vscode';
import { getActiveEditorContext } from '../context/contextGatherer';
import { runPresetPipeline } from '../pipeline/runPresetPipeline';
import { getPromptPreset } from '../presets/promptPresets';
import { escapeMarkdown } from '../utils/escape';
import { chatCommandPresetIds } from './chatCommands';

export function registerChatParticipant(): vscode.Disposable {
	return vscode.chat.createChatParticipant('promptir.chat', async (request, _chatContext, response) => {
		const presetId = chatCommandPresetIds.get(request.command ?? 'optimize');

		if (!presetId) {
			return {
				errorDetails: {
					message: `Unknown PromptIR command: /${request.command}`
				}
			};
		}

		const workspaceContext = getActiveEditorContext();
		const preset = getPromptPreset(presetId);

		if (!workspaceContext) {
			return {
				errorDetails: {
					message: `Open a file before using @promptir /${request.command ?? 'optimize'}.`
				}
			};
		}

		const rawPrompt = request.prompt.trim();

		if (preset.requiresPrompt && !rawPrompt) {
			return {
				errorDetails: {
					message: `Add input after @promptir /${request.command ?? 'optimize'} before PromptIR can continue.`
				}
			};
		}

		try {
			response.progress(`Generating with ${preset.label}...`);
			response.markdown(`${preset.label} prompt:\n\n`);
			const generatedPrompt = await runPresetPipeline(rawPrompt, workspaceContext, preset, {
				onFragment: fragment => response.markdown(escapeMarkdown(fragment)),
				onStatus: message => response.progress(message)
			});

			await vscode.env.clipboard.writeText(generatedPrompt);
			response.markdown('\n\nCopied generated prompt to clipboard.');
			response.button({
				command: 'promptir.copyToClipboard',
				title: 'Copy generated prompt',
				arguments: [generatedPrompt]
			});

			return {
				metadata: {
					command: request.command ?? 'optimize',
					presetId
				}
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to generate prompt.';

			return {
				errorDetails: {
					message: `PromptIR failed: ${message}`
				}
			};
		}
	});
}
