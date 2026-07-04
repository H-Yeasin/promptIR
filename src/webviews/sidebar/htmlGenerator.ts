import * as vscode from 'vscode';
import { AVAILABLE_PRESETS, getPromptPreset } from '../../presets/promptPresets';
import type { PromptPresetId } from '../../presets/promptPresets';
import { escapeHtml } from '../../utils/escape';
import { getNonce } from '../../utils/nonce';

export function getSidebarHtml(webview: vscode.Webview, mediaUri: vscode.Uri, initialAiProvider: string, initialOpenaiApiKey: string): string {
	const nonce = getNonce();
	const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'promptir-logo.svg'));
	const presetOptions = AVAILABLE_PRESETS.map(preset => {
		return [
			`<option value="${escapeHtml(preset.id)}"`,
			` data-placeholder="${escapeHtml(preset.placeholderText)}"`,
			` data-action="${escapeHtml(preset.actionLabel)}"`,
			` data-description="${escapeHtml(preset.description)}">`,
			`${escapeHtml(preset.label)}</option>`
		].join('');
	}).join('');
	const initialPreset = getPromptPreset('optimize' satisfies PromptPresetId);

	return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>PromptIR</title>
	<style>
		:root {
			color-scheme: light dark;
		}

		* {
			box-sizing: border-box;
		}

		html,
		body {
			height: 100%;
			margin: 0;
		}

		body {
			color: var(--vscode-foreground);
			background: var(--vscode-sideBar-background);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}

		.shell {
			display: flex;
			flex-direction: column;
			height: 100%;
			min-width: 0;
		}

		header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 10px;
			min-height: 44px;
			padding: 9px 12px;
			border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			background: var(--vscode-sideBar-background);
		}

		.brand {
			display: flex;
			align-items: center;
			gap: 9px;
			min-width: 0;
		}

		.logo {
			width: 24px;
			height: 24px;
			flex: 0 0 auto;
			border-radius: 5px;
		}

		h1 {
			margin: 0;
			font-size: 13px;
			font-weight: 600;
			line-height: 1.3;
		}

		.header-subtitle {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			line-height: 1.25;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.state-chip {
			display: inline-flex;
			align-items: center;
			gap: 5px;
			flex: 0 0 auto;
			max-width: 86px;
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.state-dot {
			width: 7px;
			height: 7px;
			flex: 0 0 auto;
			border-radius: 999px;
			background: var(--vscode-testing-iconPassed);
		}

		.state-chip.busy .state-dot {
			background: var(--vscode-progressBar-background);
		}

		.state-chip.error .state-dot {
			background: var(--vscode-errorForeground);
		}

		.messages {
			display: flex;
			flex: 1 1 auto;
			flex-direction: column;
			gap: 12px;
			min-height: 0;
			overflow-y: auto;
			padding: 14px 12px 12px;
			scrollbar-gutter: stable;
		}

		.message {
			display: grid;
			grid-template-columns: 22px minmax(0, 1fr);
			gap: 8px;
			align-items: start;
		}

		.avatar {
			display: grid;
			width: 22px;
			height: 22px;
			place-items: center;
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 5px;
			color: var(--vscode-descriptionForeground);
			background: var(--vscode-input-background);
			font-size: 11px;
			font-weight: 700;
		}

		.bubble {
			min-width: 0;
			border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			border-radius: 7px;
			padding: 9px 10px;
			background: var(--vscode-editorWidget-background);
			white-space: pre-wrap;
			overflow-wrap: anywhere;
			line-height: 1.45;
		}

		.message.user .bubble {
			background: var(--vscode-input-background);
		}

		.message.error .bubble {
			border-color: var(--vscode-inputValidation-errorBorder);
			color: var(--vscode-inputValidation-errorForeground, var(--vscode-foreground));
			background: var(--vscode-inputValidation-errorBackground);
		}

		.message.thinking .bubble {
			color: var(--vscode-descriptionForeground);
		}

		.typing {
			display: inline-flex;
			gap: 4px;
			align-items: center;
		}

		.typing span {
			width: 5px;
			height: 5px;
			border-radius: 999px;
			background: currentColor;
			opacity: 0.45;
			animation: pulse 1s ease-in-out infinite;
		}

		.typing span:nth-child(2) {
			animation-delay: 0.12s;
		}

		.typing span:nth-child(3) {
			animation-delay: 0.24s;
		}

		@keyframes pulse {
			0%, 100% {
				transform: translateY(0);
				opacity: 0.35;
			}

			50% {
				transform: translateY(-2px);
				opacity: 0.85;
			}
		}

		.composer {
			display: flex;
			flex: 0 0 auto;
			flex-direction: column;
			gap: 9px;
			border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			padding: 10px 12px 12px;
			background: var(--vscode-sideBar-background);
		}

		.preset-meta {
			display: grid;
			gap: 3px;
			min-width: 0;
			padding: 8px 9px;
			border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			border-radius: 7px;
			background: var(--vscode-editorWidget-background);
		}

		.preset-title {
			font-size: 12px;
			font-weight: 600;
			line-height: 1.35;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.preset-description {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			line-height: 1.35;
			overflow-wrap: anywhere;
		}

		select,
		textarea,
		button {
			width: 100%;
			font: inherit;
		}

		select,
		textarea {
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 4px;
			color: var(--vscode-input-foreground);
			background: var(--vscode-input-background);
			outline: none;
		}

		select:focus,
		textarea:focus,
		button:focus-visible {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: 1px;
		}

		select {
			height: 32px;
			padding: 4px 8px;
		}

		textarea {
			min-height: 92px;
			max-height: 32vh;
			padding: 9px 10px;
			resize: vertical;
			font-family: var(--vscode-editor-font-family);
			font-size: 12px;
			line-height: 1.4;
		}

		.actions {
			display: grid;
			grid-template-columns: auto 1fr auto;
			gap: 8px;
		}

		button {
			border: 0;
			border-radius: 5px;
			min-height: 30px;
			padding: 6px 10px;
			color: var(--vscode-button-foreground);
			background: var(--vscode-button-background);
			cursor: pointer;
			white-space: nowrap;
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

		.icon-button {
			width: 32px;
			padding: 0;
			font-size: 15px;
		}

		button:disabled {
			cursor: not-allowed;
			opacity: 0.55;
		}

		.status {
			min-height: 16px;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			line-height: 1.35;
		}

		.status.error {
			color: var(--vscode-errorForeground);
		}

		.follow-up-form {
			display: grid;
			gap: 10px;
			margin-top: 12px;
			padding-top: 10px;
			border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			white-space: normal;
		}

		.follow-up-item {
			display: grid;
			gap: 6px;
		}

		.follow-up-question {
			font-size: 12px;
			font-weight: 600;
			line-height: 1.35;
		}

		.follow-up-answer {
			min-height: 54px;
			max-height: 120px;
			font-family: var(--vscode-editor-font-family);
			font-size: 12px;
		}

		.follow-up-actions {
			display: grid;
			grid-template-columns: 1fr auto;
			gap: 8px;
			align-items: center;
		}

		.follow-up-actions button {
			width: auto;
		}

		.follow-up-note {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			line-height: 1.35;
		}

		.settings-panel {
			display: none;
			flex-direction: column;
			gap: 12px;
			padding: 12px;
			background: var(--vscode-editorWidget-background);
			border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
		}
		.settings-panel.open {
			display: flex;
		}
		.settings-panel label {
			font-size: 11px;
			font-weight: 600;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}
		.settings-panel input[type="password"] {
			width: 100%;
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 4px;
			color: var(--vscode-input-foreground);
			background: var(--vscode-input-background);
			height: 28px;
			padding: 4px 8px;
			outline: none;
			font-family: inherit;
		}
		.settings-panel input[type="password"]:focus {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: 1px;
		}
		.settings-status {
			color: var(--vscode-testing-iconPassed);
			font-size: 11px;
			min-height: 14px;
		}
	</style>
</head>
<body>
	<div class="shell">
		<header>
			<div class="brand">
				<img class="logo" src="${logoUri}" alt="">
				<div>
					<h1>PromptIR</h1>
					<div class="header-subtitle">Workspace prompt composer</div>
				</div>
			</div>
			<div style="display:flex; align-items: center; gap: 8px;">
				<div class="state-chip" id="stateChip">
					<span class="state-dot"></span>
					<span id="stateLabel">Ready</span>
				</div>
				<button class="icon-button" id="toggleSettings" title="Settings" aria-label="Settings" style="background: transparent;">⚙️</button>
			</div>
		</header>

		<div class="settings-panel" id="settingsPanel">
			<label>
				AI Provider
				<select id="aiProvider">
					<option value="Copilot" ${initialAiProvider === 'Copilot' ? 'selected' : ''}>GitHub Copilot</option>
					<option value="OpenAI" ${initialAiProvider === 'OpenAI' ? 'selected' : ''}>OpenAI</option>
				</select>
			</label>
			<label id="openaiKeyLabel" style="${initialAiProvider === 'OpenAI' ? 'display:flex;' : 'display:none;'}">
				OpenAI API Key
				<input type="password" id="openaiApiKey" value="${escapeHtml(initialOpenaiApiKey)}" placeholder="sk-..." />
			</label>
			<div class="settings-status" id="settingsStatus"></div>
		</div>

		<main class="messages" id="messages" aria-live="polite">
			<div class="message assistant">
				<div class="avatar">P</div>
				<div class="bubble">Ready for the active editor.</div>
			</div>
		</main>

		<section class="composer">
			<select id="preset" aria-label="Prompt preset">
				${presetOptions}
			</select>
			<div class="preset-meta">
				<div class="preset-title" id="presetTitle">${escapeHtml(initialPreset.label)}</div>
				<div class="preset-description" id="presetDescription">${escapeHtml(initialPreset.description)}</div>
			</div>
			<textarea id="prompt" placeholder="${escapeHtml(initialPreset.placeholderText)}" aria-label="Prompt"></textarea>
			<div class="actions">
				<button class="secondary icon-button" id="clear" type="button" title="New conversation" aria-label="New conversation">+</button>
				<button id="generate" type="button">${escapeHtml(initialPreset.actionLabel)}</button>
				<button class="secondary" id="copy" type="button" disabled>Copy</button>
			</div>
			<div class="status" id="status"></div>
		</section>
	</div>

	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const messages = document.getElementById('messages');
		const preset = document.getElementById('preset');
		const promptInput = document.getElementById('prompt');
		const generateButton = document.getElementById('generate');
		const copyButton = document.getElementById('copy');
		const clearButton = document.getElementById('clear');
		const status = document.getElementById('status');
		const stateChip = document.getElementById('stateChip');
		const stateLabel = document.getElementById('stateLabel');
		const presetTitle = document.getElementById('presetTitle');
		const presetDescription = document.getElementById('presetDescription');

		const toggleSettings = document.getElementById('toggleSettings');
		const settingsPanel = document.getElementById('settingsPanel');
		const aiProvider = document.getElementById('aiProvider');
		const openaiKeyLabel = document.getElementById('openaiKeyLabel');
		const openaiApiKey = document.getElementById('openaiApiKey');
		const settingsStatus = document.getElementById('settingsStatus');

		let currentResponse = '';
		let responseNode;
		let activePrompt = '';

		function appendMessage(text, className) {
			const node = document.createElement('div');
			node.className = 'message' + (className ? ' ' + className : '');
			const avatar = document.createElement('div');
			avatar.className = 'avatar';
			avatar.textContent = className === 'user' ? 'Y' : 'P';
			const bubble = document.createElement('div');
			bubble.className = 'bubble';
			bubble.textContent = text;
			node.append(avatar, bubble);
			messages.appendChild(node);
			messages.scrollTop = messages.scrollHeight;
			return bubble;
		}

		function appendThinkingMessage() {
			const node = document.createElement('div');
			node.className = 'message assistant thinking';
			const avatar = document.createElement('div');
			avatar.className = 'avatar';
			avatar.textContent = 'P';
			const bubble = document.createElement('div');
			bubble.className = 'bubble';
			const typing = document.createElement('span');
			typing.className = 'typing';
			typing.setAttribute('aria-label', 'Generating');
			typing.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));
			bubble.appendChild(typing);
			node.append(avatar, bubble);
			messages.appendChild(node);
			messages.scrollTop = messages.scrollHeight;
			return bubble;
		}

		function extractQuestions(text) {
			const lines = text
				.split(/\\r?\\n/)
				.map(line => line.trim())
				.filter(Boolean);
			const numbered = lines
				.map(line => line.match(/^\\d+[.)]\\s*(.+)$/)?.[1]?.trim())
				.filter(Boolean);

			if (numbered.length) {
				return numbered;
			}

			return lines.filter(line => line.endsWith('?')).map(line => line.replace(/^[-*]\\s*/, ''));
		}

		function appendFollowUpForm(target, originalPrompt, generatedText) {
			const questions = extractQuestions(generatedText);

			if (!questions.length) {
				return;
			}

			const form = document.createElement('div');
			form.className = 'follow-up-form';

			for (const question of questions) {
				const item = document.createElement('label');
				item.className = 'follow-up-item';
				const questionText = document.createElement('span');
				questionText.className = 'follow-up-question';
				questionText.textContent = question;
				const answer = document.createElement('textarea');
				answer.className = 'follow-up-answer';
				answer.placeholder = 'Answer this question...';
				answer.dataset.question = question;
				item.append(questionText, answer);
				form.appendChild(item);
			}

			const actions = document.createElement('div');
			actions.className = 'follow-up-actions';
			const note = document.createElement('div');
			note.className = 'follow-up-note';
			note.textContent = 'Answer what matters, then create the final prompt.';
			const refineButton = document.createElement('button');
			refineButton.type = 'button';
			refineButton.textContent = 'Create Prompt';
			actions.append(note, refineButton);
			form.appendChild(actions);

			refineButton.addEventListener('click', () => {
				const answers = Array.from(form.querySelectorAll('textarea')).map(answer => ({
					question: answer.dataset.question || '',
					answer: answer.value
				}));
				const answered = answers.filter(answer => answer.answer.trim());

				appendMessage(answered.length
					? answered.map((answer, index) => (index + 1) + '. ' + answer.question + '\\n' + answer.answer.trim()).join('\\n\\n')
					: '(no follow-up answers)', 'user');
				currentResponse = '';
				responseNode = appendThinkingMessage();
				copyButton.disabled = true;
				status.className = 'status';
				status.textContent = 'Creating final prompt...';
				setState('Working', 'busy');
				setBusy(true);

				vscode.postMessage({
					type: 'refineFromFollowUp',
					originalPrompt,
					answers
				});
			});

			target.appendChild(form);
			form.querySelector('textarea')?.focus();
			messages.scrollTop = messages.scrollHeight;
		}

		function setState(label, className) {
			stateLabel.textContent = label;
			stateChip.className = 'state-chip' + (className ? ' ' + className : '');
		}

		function setBusy(isBusy) {
			generateButton.disabled = isBusy;
			preset.disabled = isBusy;
			promptInput.disabled = isBusy;
			clearButton.disabled = isBusy;
		}

		function updatePresetText() {
			const selected = preset.options[preset.selectedIndex];
			promptInput.placeholder = selected?.dataset.placeholder || '';
			presetTitle.textContent = selected?.textContent || 'PromptIR';
			presetDescription.textContent = selected?.dataset.description || '';
			generateButton.textContent = selected?.dataset.action || 'Generate';
		}

		preset.addEventListener('change', updatePresetText);

		let saveTimeout;
		function saveSettings() {
			settingsStatus.textContent = 'Saving...';
			vscode.postMessage({
				type: 'saveSettings',
				aiProvider: aiProvider.value,
				openaiApiKey: openaiApiKey.value
			});
		}

		toggleSettings.addEventListener('click', () => {
			settingsPanel.classList.toggle('open');
		});

		aiProvider.addEventListener('change', () => {
			openaiKeyLabel.style.display = aiProvider.value === 'OpenAI' ? 'flex' : 'none';
			saveSettings();
		});

		openaiApiKey.addEventListener('input', () => {
			clearTimeout(saveTimeout);
			saveTimeout = setTimeout(saveSettings, 500);
		});

		function generate() {
			const prompt = promptInput.value.trim();
			const selectedPresetId = preset.value;

			activePrompt = prompt;
			appendMessage(prompt || '(no extra instructions)', 'user');
			currentResponse = '';
			responseNode = appendThinkingMessage();
			copyButton.disabled = true;
			status.className = 'status';
			status.textContent = 'Generating...';
			setState('Working', 'busy');
			setBusy(true);

			vscode.postMessage({
				type: 'generate',
				presetId: selectedPresetId,
				prompt
			});
		}

		generateButton.addEventListener('click', () => {
			generate();
		});

		promptInput.addEventListener('keydown', event => {
			if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !generateButton.disabled) {
				event.preventDefault();
				generate();
			}
		});

		copyButton.addEventListener('click', () => {
			if (!currentResponse) {
				return;
			}

			vscode.postMessage({
				type: 'copy',
				text: currentResponse
			});
		});

		clearButton.addEventListener('click', () => {
			messages.replaceChildren();
			currentResponse = '';
			responseNode = undefined;
			copyButton.disabled = true;
			status.className = 'status';
			status.textContent = '';
			setState('Ready', '');
			appendMessage('Ready for the active editor.', 'assistant');
			promptInput.focus();
		});

		window.addEventListener('message', event => {
			const message = event.data;

			if (message.type === 'generationStarted') {
				status.textContent = message.label ? 'Generating with ' + message.label + '...' : 'Generating...';
				return;
			}

			if (message.type === 'fragment') {
				currentResponse += message.fragment;
				responseNode.textContent = currentResponse;
				messages.scrollTop = messages.scrollHeight;
				return;
			}

			if (message.type === 'complete') {
				currentResponse = message.prompt;
				responseNode.textContent = currentResponse;
				copyButton.disabled = false;
				if (message.presetId === 'askFollowUpQuestions') {
					copyButton.disabled = true;
					appendFollowUpForm(responseNode, activePrompt, currentResponse);
					status.textContent = 'Answer the follow-up questions to create the final prompt.';
				} else {
					status.textContent = message.copied ? 'Generated prompt copied to clipboard.' : 'Generated prompt is ready.';
				}
				setState('Ready', '');
				setBusy(false);
				return;
			}

			if (message.type === 'copied') {
				status.textContent = 'Copied to clipboard.';
				return;
			}

			if (message.type === 'error') {
				if (responseNode && !currentResponse) {
					responseNode.parentElement?.remove();
				}
				appendMessage(message.message || 'PromptIR failed.', 'error');
				status.className = 'status error';
				status.textContent = '';
				setState('Error', 'error');
				setBusy(false);
			}

			if (message.type === 'settingsSaved') {
				settingsStatus.textContent = 'Saved';
				setTimeout(() => {
					if (settingsStatus.textContent === 'Saved') {
						settingsStatus.textContent = '';
					}
				}, 2000);
			}
		});

		updatePresetText();
	</script>
</body>
</html>`;
}
