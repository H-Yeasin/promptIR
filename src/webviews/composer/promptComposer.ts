import * as vscode from 'vscode';
import { getPromptPreset } from '../../presets/promptPresets';
import { getComposerHtml } from './composerHtml';
import type { ComposerResult } from './composerTypes';

export function showPromptComposer(fileName: string): Promise<ComposerResult | undefined> {
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

		panel.webview.onDidReceiveMessage(message => {
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
