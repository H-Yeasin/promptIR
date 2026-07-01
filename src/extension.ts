import * as vscode from 'vscode';
import { processPromptWithAI } from './aiEngine';
import { getActiveEditorContext, getPromptAwareWorkspaceContext } from './contextGatherer';
import { getPromptForPreset, getPromptPreset, promptPresets } from './promptPresets';
import type { PromptProcessingOptions } from './aiEngine';
import type { WorkspaceContext } from './contextGatherer';
import type { PromptPreset, PromptPresetId } from './promptPresets';

interface ComposerResult {
	presetId: PromptPresetId;
	prompt: string;
}

const chatCommandPresetIds = new Map<string, PromptPresetId>([
	['optimize', 'optimize'],
	['review', 'reviewBugs'],
	['explain', 'explainFile'],
	['problems', 'analyzeProblems'],
	['plan', 'implementationPlan']
]);

export function activate(context: vscode.ExtensionContext) {
	const optimizeCommand = vscode.commands.registerCommand('promptir.optimize', async () => {
		const workspaceContext = getActiveEditorContext();

		if (!workspaceContext) {
			vscode.window.showWarningMessage('Open a file before optimizing a prompt.');
			return;
		}

		const composerResult = await showPromptComposer(workspaceContext.fileName);

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

	const copyCommand = vscode.commands.registerCommand('promptir.copyToClipboard', async (text: string) => {
		await vscode.env.clipboard.writeText(text);
		vscode.window.showInformationMessage('PromptIR copied the generated prompt.');
	});

	const chatParticipant = vscode.chat.createChatParticipant('promptir.chat', async (request, _chatContext, response) => {
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

		response.progress('Gathering files and diagnostics...');

		try {
			response.progress(`Generating with ${preset.label}...`);
			response.markdown(`${preset.label} prompt:\n\n`);
			const generatedPrompt = await runPresetPipeline(rawPrompt, workspaceContext, preset, {
				onFragment: fragment => response.markdown(escapeMarkdown(fragment))
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

	context.subscriptions.push(optimizeCommand, copyCommand, chatParticipant);
}

export function deactivate() {}

async function runPresetPipeline(
	prompt: string,
	workspaceContext: WorkspaceContext,
	preset: PromptPreset,
	options: PromptProcessingOptions = {}
): Promise<string> {
	const rawPrompt = getPromptForPreset(prompt, preset);

	if (preset.requiresPrompt && !rawPrompt.trim()) {
		throw new Error(`${preset.label} needs input before PromptIR can continue.`);
	}

	const promptAwareContext = await getPromptAwareWorkspaceContext(
		rawPrompt.trim(),
		workspaceContext,
		preset.contextStrategy
	);

	return processPromptWithAI(rawPrompt.trim(), promptAwareContext, preset, options);
}

function showPromptComposer(fileName: string): Promise<ComposerResult | undefined> {
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

function getComposerHtml(webview: vscode.Webview, fileName: string): string {
	const nonce = getNonce();
	const escapedFileName = escapeHtml(fileName);
	const presetsJson = JSON.stringify(promptPresets.map(preset => ({
		id: preset.id,
		category: preset.category,
		label: preset.label,
		description: preset.description,
		actionLabel: preset.actionLabel,
		placeholderText: preset.placeholderText,
		requiresPrompt: preset.requiresPrompt
	}))).replace(/</g, '\\u003c');

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>PromptIR Composer</title>
	<style>
		:root {
			color-scheme: light dark;
		}

		body {
			margin: 0;
			padding: 24px;
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
			font-family: var(--vscode-font-family);
		}

		main {
			display: grid;
			gap: 16px;
			max-width: 860px;
		}

		header {
			display: grid;
			gap: 6px;
		}

		h1 {
			margin: 0;
			font-size: 20px;
			font-weight: 600;
		}

		.context {
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			overflow-wrap: anywhere;
		}

		.presets {
			display: grid;
			gap: 14px;
		}

		.preset-group {
			display: grid;
			gap: 8px;
		}

		.preset-group-title {
			margin: 0;
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			font-weight: 700;
			letter-spacing: 0;
			text-transform: uppercase;
		}

		.preset-group-items {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
			gap: 8px;
		}

		.preset {
			min-height: 72px;
			padding: 10px;
			border: 1px solid var(--vscode-button-border, var(--vscode-input-border));
			border-radius: 6px;
			color: var(--vscode-foreground);
			background: var(--vscode-button-secondaryBackground);
			text-align: left;
		}

		.preset:hover {
			background: var(--vscode-button-secondaryHoverBackground);
		}

		.preset[aria-pressed="true"] {
			border-color: var(--vscode-focusBorder);
			color: var(--vscode-button-foreground);
			background: var(--vscode-button-background);
		}

		.preset-title {
			display: block;
			margin-bottom: 5px;
			font-weight: 600;
		}

		.preset-description {
			display: block;
			color: inherit;
			font-size: 12px;
			line-height: 1.35;
			opacity: 0.84;
		}

		.selected-preset {
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			line-height: 1.4;
		}

		.selected-preset strong {
			color: var(--vscode-foreground);
		}

		textarea {
			box-sizing: border-box;
			width: 100%;
			min-height: 260px;
			resize: vertical;
			padding: 12px;
			border: 1px solid var(--vscode-input-border);
			border-radius: 6px;
			color: var(--vscode-input-foreground);
			background: var(--vscode-input-background);
			font-family: var(--vscode-editor-font-family);
			font-size: 13px;
			line-height: 1.5;
			outline: none;
		}

		textarea:focus {
			border-color: var(--vscode-focusBorder);
		}

		.actions {
			display: flex;
			gap: 8px;
			align-items: center;
			justify-content: flex-end;
		}

		button {
			border: 0;
			border-radius: 4px;
			padding: 8px 12px;
			color: var(--vscode-button-foreground);
			background: var(--vscode-button-background);
			cursor: pointer;
			font: inherit;
		}

		button:hover {
			background: var(--vscode-button-hoverBackground);
		}

		button.secondary {
			color: var(--vscode-button-secondaryForeground);
			background: var(--vscode-button-secondaryBackground);
		}

		button.secondary:hover {
			background: var(--vscode-button-secondaryHoverBackground);
		}

		.hint {
			margin-right: auto;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
		}
	</style>
</head>
<body>
	<main>
		<header>
			<h1>PromptIR Composer</h1>
			<div class="context">Using active context from ${escapedFileName}</div>
		</header>
		<div class="presets" id="presets" aria-label="Prompt intent presets"></div>
		<div class="selected-preset" id="selectedPreset"></div>
		<textarea id="prompt" autofocus placeholder="Describe what you want the agent to do. Add constraints, preferred style, edge cases, or testing expectations here."></textarea>
		<div class="actions">
			<div class="hint" id="hint">Ctrl+Enter to generate</div>
			<button class="secondary" id="cancel" type="button">Cancel</button>
			<button id="generate" type="button">Optimize</button>
		</div>
	</main>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const presets = ${presetsJson};
		let selectedPreset = presets[0];

		const presetsContainer = document.getElementById('presets');
		const selectedPresetText = document.getElementById('selectedPreset');
		const promptInput = document.getElementById('prompt');
		const generateButton = document.getElementById('generate');
		const cancelButton = document.getElementById('cancel');
		const hint = document.getElementById('hint');

		function renderPresets() {
			const categories = ['General', 'Code', 'Debugging', 'Specialized'];

			presetsContainer.replaceChildren(...categories.map(category => {
				const group = document.createElement('section');
				const heading = document.createElement('h2');
				const items = document.createElement('div');
				const categoryPresets = presets.filter(preset => preset.category === category);

				group.className = 'preset-group';
				heading.className = 'preset-group-title';
				heading.textContent = category;
				items.className = 'preset-group-items';

				items.replaceChildren(...categoryPresets.map(preset => {
				const button = document.createElement('button');
				const title = document.createElement('span');
				const description = document.createElement('span');

				button.type = 'button';
				button.className = 'preset';
				button.setAttribute('aria-pressed', String(preset.id === selectedPreset.id));
				title.className = 'preset-title';
				title.textContent = preset.label;
				description.className = 'preset-description';
				description.textContent = preset.description;

				button.append(title, description);
				button.addEventListener('click', () => {
					selectedPreset = preset;
					updateSelectedPreset();
					renderPresets();
				});

				return button;
				}));

				group.append(heading, items);
				return group;
			}));
		}

		function updateSelectedPreset() {
			promptInput.placeholder = selectedPreset.placeholderText;
			generateButton.textContent = selectedPreset.actionLabel;
			selectedPresetText.innerHTML = '<strong>' + selectedPreset.label + '</strong>: ' + selectedPreset.description;
			hint.textContent = selectedPreset.requiresPrompt
				? 'Ctrl+Enter to generate after adding the required input'
				: 'Ctrl+Enter to generate; prompt details are optional';
		}

		function generate() {
			const prompt = promptInput.value.trim();

			if (selectedPreset.requiresPrompt && !prompt) {
				promptInput.focus();
				return;
			}

			vscode.postMessage({ type: 'generate', presetId: selectedPreset.id, prompt });
		}

		generateButton.addEventListener('click', generate);
		cancelButton.addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));
		promptInput.addEventListener('keydown', event => {
			if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
				event.preventDefault();
				generate();
			}
		});

		updateSelectedPreset();
		renderPresets();
		promptInput.focus();
	</script>
</body>
</html>`;
}

function getNonce(): string {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (let index = 0; index < 32; index++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return text;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function escapeMarkdown(value: string): string {
	return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, '\\$&');
}
