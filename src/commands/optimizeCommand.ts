import * as vscode from 'vscode';
import { getActiveEditorContext } from '../context/contextGatherer';
import { runPresetPipeline } from '../pipeline/runPresetPipeline';
import { getPromptPreset } from '../presets/promptPresets';
import { showPromptComposer } from '../webviews/composer/promptComposer';

export function registerOptimizeCommand(extensionUri: vscode.Uri): vscode.Disposable {
	return vscode.commands.registerCommand('promptir.optimize', async () => {
		const workspaceContext = getActiveEditorContext();

		if (!workspaceContext) {
			vscode.window.showWarningMessage('Open a file before optimizing a prompt.');
			return;
		}

		await showPromptComposer(workspaceContext.fileName, extensionUri, {
			generateFollowUpQuestions: prompt => runPresetPipeline(
				prompt,
				workspaceContext,
				getPromptPreset('askFollowUpQuestions')
			),
			generatePrompt: (composerResult, onFragment) => {
				const preset = getPromptPreset(composerResult.presetId);

				return vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: `PromptIR: ${preset.label}`,
					cancellable: false
				}, async progress => {
					return runPresetPipeline(composerResult.prompt, workspaceContext, preset, {
						onFragment,
						onStatus: message => progress.report({ message })
					});
				});
			}
		});
	});
}
