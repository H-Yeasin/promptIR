import * as vscode from 'vscode';
import { getPromptPreset } from '../../presets/promptPresets';
import { getComposerHtml } from './composerHtml';
import { composeFollowUpRefinementPrompt } from './followUpRefinement';
import type { ComposerResult, FollowUpAnswer } from './composerTypes';

export interface PromptComposerOptions {
	generateFollowUpQuestions?: (prompt: string) => Promise<string>;
}

export function showPromptComposer(fileName: string, options: PromptComposerOptions = {}): Promise<ComposerResult | undefined> {
	return new Promise(resolve => {
		const panel = vscode.window.createWebviewPanel(
			'promptirComposer',
			'PromptIR Composer',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		let settled = false;
		const settle = (value: ComposerResult | undefined) => {
			if (settled) {
				return;
			}

			settled = true;
			resolve(value);
			panel.dispose();
		};

		panel.webview.html = getComposerHtml(panel.webview, fileName);

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
				settle({
					presetId: 'optimize',
					prompt: composeFollowUpRefinementPrompt(message.originalPrompt, answers)
				});
				return;
			}

			if (message?.type === 'generate' && typeof message.prompt === 'string' && typeof message.presetId === 'string') {
				const preset = getPromptPreset(message.presetId);
				settle({
					presetId: preset.id,
					prompt: message.prompt
				});
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
