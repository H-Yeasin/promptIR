import * as vscode from 'vscode';
import { getActiveEditorContext } from '../context/contextGatherer';
import { runPresetPipeline } from '../pipeline/runPresetPipeline';
import { getPromptPreset } from '../presets/promptPresets';
import { showPromptComposer } from '../webviews/composer/promptComposer';

export function registerOptimizeCommand(): vscode.Disposable {
	return vscode.commands.registerCommand('promptir.optimize', async () => {
		const workspaceContext = getActiveEditorContext();

		if (!workspaceContext) {
			vscode.window.showWarningMessage('Open a file before optimizing a prompt.');
			return;
		}

		const composerResult = await showPromptComposer(workspaceContext.fileName, {
			generateFollowUpQuestions: prompt => runPresetPipeline(
				prompt,
				workspaceContext,
				getPromptPreset('askFollowUpQuestions')
			)
		});

		if (!composerResult) {
			return;
		}

		const preset = getPromptPreset(composerResult.presetId);

		try {
			const generatedPrompt = await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `PromptIR: ${preset.label}`,
				cancellable: false
			}, async progress => {
				progress.report({ message: 'Gathering files and diagnostics...' });

				progress.report({ message: 'Synthesizing prompt...' });
				return runPresetPipeline(composerResult.prompt, workspaceContext, preset);
			});

			await vscode.env.clipboard.writeText(generatedPrompt);

			const document = await vscode.workspace.openTextDocument({
				content: generatedPrompt,
				language: 'plaintext'
			});

			await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
			vscode.window.showInformationMessage('PromptIR copied the generated prompt. Paste it into Codex or Claude chat.');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to generate prompt.';
			vscode.window.showErrorMessage(`PromptIR failed: ${message}`);
		}
	});
}
