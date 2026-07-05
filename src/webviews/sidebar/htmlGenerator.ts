import * as vscode from 'vscode';
import { AVAILABLE_PRESETS, getPromptPreset } from '../../presets/promptPresets';
import type { PromptPresetId } from '../../presets/promptPresets';
import { escapeHtml } from '../../utils/escape';
import { getNonce } from '../../utils/nonce';
import { sidebarScript } from './sidebarScript';
import { sidebarStyles } from './sidebarStyles';

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
		${sidebarStyles}
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
			<div class="header-actions">
				<div class="state-chip" id="stateChip">
					<span class="state-dot"></span>
					<span id="stateLabel">Ready</span>
				</div>
				<button class="secondary" id="clearRecent" type="button" title="Clear recent conversation">Clear Recent</button>
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
				<button class="secondary" id="clear" type="button" title="Clear recent conversation">Clear</button>
				<button id="generate" type="button">${escapeHtml(initialPreset.actionLabel)}</button>
				<button class="secondary" id="copy" type="button" disabled>Copy</button>
			</div>
			<div class="status" id="status"></div>
		</section>
	</div>

	<script nonce="${nonce}">
${sidebarScript}
	</script>
</body>
</html>`;
}
