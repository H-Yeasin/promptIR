import * as vscode from 'vscode';
import { getSidebarHtml } from './htmlGenerator';
import { handleGenerate, handleRefineFromFollowUp, handleSaveSettings } from './messageHandlers';
import type { SidebarMessage } from './messageHandlers';

export class PromptIRSidebarProvider implements vscode.WebviewViewProvider {
	public constructor(private readonly extensionUri: vscode.Uri) {}

	public resolveWebviewView(webviewView: vscode.WebviewView): void {
		const mediaUri = vscode.Uri.joinPath(this.extensionUri, 'media');

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [mediaUri]
		};

		const config = vscode.workspace.getConfiguration('promptir');
		const initialAiProvider = config.get<string>('aiProvider', 'Copilot');
		const initialOpenaiApiKey = config.get<string>('openaiApiKey', '');

		webviewView.webview.html = getSidebarHtml(webviewView.webview, mediaUri, initialAiProvider, initialOpenaiApiKey);

		webviewView.webview.onDidReceiveMessage(async (message: SidebarMessage) => {
			if (message?.type === 'generate') {
				await handleGenerate(webviewView, message);
				return;
			}

			if (message?.type === 'refineFromFollowUp') {
				await handleRefineFromFollowUp(webviewView, message);
				return;
			}

			if (message?.type === 'copy' && typeof message.text === 'string') {
				await vscode.env.clipboard.writeText(message.text);
				await webviewView.webview.postMessage({ type: 'copied' });
				return;
			}

			if (message?.type === 'saveSettings') {
				await handleSaveSettings(webviewView, message);
				return;
			}
		});
	}
}
