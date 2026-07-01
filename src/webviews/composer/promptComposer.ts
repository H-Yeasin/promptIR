import * as vscode from 'vscode';
import { getPromptPreset } from '../../presets/promptPresets';
import { getComposerHtml } from './composerHtml';
import { composeFollowUpRefinementPrompt } from './followUpRefinement';
import type { ComposerResult, FollowUpAnswer } from './composerTypes';

export interface PromptComposerOptions {
	generateFollowUpQuestions?: (prompt: string) => Promise<string>;
	generatePrompt?: (result: ComposerResult, onFragment: (fragment: string) => void) => Thenable<string>;
}

export function showPromptComposer(
	fileName: string,
	extensionUri: vscode.Uri,
	options: PromptComposerOptions = {}
): Promise<ComposerResult | undefined> {
	return new Promise(resolve => {
		const mediaUri = vscode.Uri.joinPath(extensionUri, 'media');
		const panel = vscode.window.createWebviewPanel(
			'promptirComposer',
			'PromptIR Composer',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [mediaUri]
			}
		);
		panel.iconPath = vscode.Uri.joinPath(mediaUri, 'promptir-logo.svg');

		let settled = false;
		const settle = (value: ComposerResult | undefined, disposePanel = true) => {
			if (settled) {
				return;
			}

			settled = true;
			resolve(value);
			if (disposePanel) {
				panel.dispose();
			}
		};

		panel.webview.html = getComposerHtml(panel.webview, fileName, mediaUri);

		const generateAndDisplayPrompt = async (result: ComposerResult) => {
			if (!options.generatePrompt) {
				settle(result);
				return;
			}

			panel.webview.postMessage({ type: 'generationStarted' });

			try {
				const generatedPrompt = await options.generatePrompt(result, fragment => {
					panel.webview.postMessage({
						type: 'generatedPromptFragment',
						fragment
					});
				});

				await vscode.env.clipboard.writeText(generatedPrompt);
				panel.webview.postMessage({
					type: 'generatedPromptComplete',
					prompt: generatedPrompt
				});
				vscode.window.showInformationMessage('PromptIR copied the generated prompt.');
				settle(undefined, false);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unable to generate prompt.';
				panel.webview.postMessage({
					type: 'generatedPromptError',
					message: errorMessage
				});
				settle(undefined, false);
			}
		};

		panel.webview.onDidReceiveMessage(async message => {
			if (message?.type === 'generateFollowUpQuestions' && typeof message.prompt === 'string') {
				if (!options.generateFollowUpQuestions) {
					panel.webview.postMessage({
						type: 'followUpQuestionsError',
						message: 'Follow-up question generation is unavailable.'
					});
					return;
				}

				try {
					const questions = await options.generateFollowUpQuestions(message.prompt);
					panel.webview.postMessage({
						type: 'followUpQuestions',
						questions
					});
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unable to generate follow-up questions.';
					panel.webview.postMessage({
						type: 'followUpQuestionsError',
						message: errorMessage
					});
				}
				return;
			}

			if (
				message?.type === 'refineFromFollowUp'
				&& typeof message.originalPrompt === 'string'
				&& Array.isArray(message.answers)
			) {
				const answers = message.answers.filter(isFollowUpAnswer);
				await generateAndDisplayPrompt({
					presetId: 'optimize',
					prompt: composeFollowUpRefinementPrompt(message.originalPrompt, answers)
				});
				return;
			}

			if (message?.type === 'generate' && typeof message.prompt === 'string' && typeof message.presetId === 'string') {
				const preset = getPromptPreset(message.presetId);
				await generateAndDisplayPrompt({
					presetId: preset.id,
					prompt: message.prompt
				});
				return;
			}

			if (message?.type === 'copyGeneratedPrompt' && typeof message.prompt === 'string') {
				try {
					await vscode.env.clipboard.writeText(message.prompt);
					panel.webview.postMessage({ type: 'generatedPromptCopied' });
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : 'Unable to copy edited prompt.';
					panel.webview.postMessage({
						type: 'generatedPromptCopyError',
						message: errorMessage
					});
				}
				return;
			}

			if (message?.type === 'cancel') {
				settle(undefined);
			}
		});

		panel.onDidDispose(() => settle(undefined));
	});
}

function isFollowUpAnswer(value: unknown): value is FollowUpAnswer {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Partial<FollowUpAnswer>;

	return typeof candidate.question === 'string' && typeof candidate.answer === 'string';
}
