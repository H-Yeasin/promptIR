import * as vscode from 'vscode';
import { promptPresets } from '../../presets/promptPresets';
import { escapeHtml } from '../../utils/escape';
import { getNonce } from '../../utils/nonce';

export function getComposerHtml(webview: vscode.Webview, fileName: string): string {
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

		.follow-up-panel {
			display: none;
			gap: 12px;
		}

		.follow-up-panel.visible {
			display: grid;
		}

		.follow-up-heading {
			margin: 0;
			font-size: 14px;
			font-weight: 600;
		}

		.follow-up-list {
			display: grid;
			gap: 10px;
		}

		.follow-up-item {
			display: grid;
			gap: 6px;
		}

		.follow-up-question {
			font-size: 13px;
			font-weight: 600;
			line-height: 1.4;
		}

		.follow-up-answer {
			min-height: 72px;
		}

		.status {
			min-height: 18px;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			line-height: 1.4;
		}

		.status.error {
			color: var(--vscode-errorForeground);
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

		button:disabled {
			cursor: default;
			opacity: 0.65;
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
		<section class="follow-up-panel" id="followUpPanel" aria-live="polite">
			<h2 class="follow-up-heading">Answer Follow-Up Questions</h2>
			<div class="follow-up-list" id="followUpList"></div>
		</section>
		<div class="actions">
			<div class="hint" id="hint">Ctrl+Enter to generate</div>
			<button class="secondary" id="cancel" type="button">Cancel</button>
			<button id="generate" type="button">Optimize</button>
		</div>
		<div class="status" id="status"></div>
	</main>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const presets = ${presetsJson};
		let selectedPreset = presets[0];
		let followUpQuestions = [];
		let originalFollowUpPrompt = '';
		let isGeneratingQuestions = false;

		const presetsContainer = document.getElementById('presets');
		const selectedPresetText = document.getElementById('selectedPreset');
		const promptInput = document.getElementById('prompt');
		const followUpPanel = document.getElementById('followUpPanel');
		const followUpList = document.getElementById('followUpList');
		const generateButton = document.getElementById('generate');
		const cancelButton = document.getElementById('cancel');
		const hint = document.getElementById('hint');
		const status = document.getElementById('status');

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
					resetFollowUpState();
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
			generateButton.textContent = getGenerateLabel();
			selectedPresetText.innerHTML = '<strong>' + selectedPreset.label + '</strong>: ' + selectedPreset.description;
			if (selectedPreset.id === 'askFollowUpQuestions' && followUpQuestions.length) {
				hint.textContent = 'Answer what you can, then Ctrl+Enter to refine';
				return;
			}

			hint.textContent = selectedPreset.requiresPrompt
				? 'Ctrl+Enter to generate after adding the required input'
				: 'Ctrl+Enter to generate; prompt details are optional';
		}

		function getGenerateLabel() {
			if (isGeneratingQuestions) {
				return 'Asking...';
			}

			if (selectedPreset.id === 'askFollowUpQuestions' && followUpQuestions.length) {
				return 'Refine Prompt';
			}

			return selectedPreset.actionLabel;
		}

		function setStatus(message, isError) {
			status.textContent = message;
			status.className = isError ? 'status error' : 'status';
		}

		function resetFollowUpState() {
			followUpQuestions = [];
			originalFollowUpPrompt = '';
			followUpList.replaceChildren();
			followUpPanel.classList.remove('visible');
			generateButton.disabled = false;
			isGeneratingQuestions = false;
			setStatus('', false);
		}

		function parseQuestions(text) {
			return text
				.split(/\\r?\\n/)
				.map(line => line.trim())
				.filter(Boolean)
				.map(line => line.replace(/^[-*]\\s+/, '').replace(/^\\d+[.)]\\s+/, '').trim())
				.filter(Boolean);
		}

		function renderFollowUpQuestions(questions) {
			followUpQuestions = questions;
			followUpList.replaceChildren(...questions.map((question, index) => {
				const item = document.createElement('div');
				const label = document.createElement('label');
				const answer = document.createElement('textarea');

				item.className = 'follow-up-item';
				label.className = 'follow-up-question';
				label.textContent = String(index + 1) + '. ' + question;
				answer.className = 'follow-up-answer';
				answer.placeholder = 'Answer this question';
				answer.dataset.question = question;

				item.append(label, answer);
				return item;
			}));
			followUpPanel.classList.add('visible');
			followUpList.querySelector('textarea')?.focus();
		}

		function collectFollowUpAnswers() {
			return Array.from(followUpList.querySelectorAll('textarea')).map(answer => ({
				question: answer.dataset.question || '',
				answer: answer.value.trim()
			}));
		}

		function generate() {
			const prompt = promptInput.value.trim();

			if (selectedPreset.requiresPrompt && !prompt) {
				promptInput.focus();
				return;
			}

			if (selectedPreset.id === 'askFollowUpQuestions') {
				if (followUpQuestions.length) {
					vscode.postMessage({
						type: 'refineFromFollowUp',
						originalPrompt: prompt || originalFollowUpPrompt,
						answers: collectFollowUpAnswers()
					});
					return;
				}

				originalFollowUpPrompt = prompt;
				isGeneratingQuestions = true;
				generateButton.disabled = true;
				updateSelectedPreset();
				setStatus('Generating follow-up questions...', false);
				vscode.postMessage({ type: 'generateFollowUpQuestions', prompt });
				return;
			}

			vscode.postMessage({ type: 'generate', presetId: selectedPreset.id, prompt });
		}

		window.addEventListener('message', event => {
			const message = event.data;

			if (message?.type === 'followUpQuestions' && typeof message.questions === 'string') {
				const questions = parseQuestions(message.questions);
				isGeneratingQuestions = false;
				generateButton.disabled = false;

				if (!questions.length) {
					setStatus('PromptIR could not find questions in the generated response. Try adding a bit more detail.', true);
					updateSelectedPreset();
					return;
				}

				renderFollowUpQuestions(questions);
				setStatus('', false);
				updateSelectedPreset();
				return;
			}

			if (message?.type === 'followUpQuestionsError') {
				isGeneratingQuestions = false;
				generateButton.disabled = false;
				setStatus(message.message || 'Unable to generate follow-up questions.', true);
				updateSelectedPreset();
			}
		});

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
