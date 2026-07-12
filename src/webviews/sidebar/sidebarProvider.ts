import * as vscode from 'vscode';
import { GraphifyDriver } from '../../graphifyDriver';
import { GrepaiDriver } from '../../grepaiDriver';
import { OllamaDriver } from '../../ollamaDriver';
import { getOpenAiApiKey } from '../../secrets';
import { getSidebarHtml } from './htmlGenerator';
import {
	handleGenerate,
	handleInstallGraphify,
	handleInstallGrepai,
	handleInstallOllama,
	handleRefineFromFollowUp,
	handleSaveSettings,
	postToolStatus
} from './messageHandlers';
import type { SidebarMessage } from './messageHandlers';

export class PromptIRSidebarProvider implements vscode.WebviewViewProvider {
	private readonly graphifyDriver = new GraphifyDriver();
	private readonly grepaiDriver = new GrepaiDriver();
	private readonly ollamaDriver = new OllamaDriver();

	public constructor(private readonly extensionUri: vscode.Uri) {}

	public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
		const mediaUri = vscode.Uri.joinPath(this.extensionUri, 'media');

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [mediaUri]
		};

		const config = vscode.workspace.getConfiguration('promptir');
		const initialAiProvider = config.get<string>('aiProvider', 'Copilot');
		const initialOpenaiApiKey = await getOpenAiApiKey();

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

			if (message?.type === 'requestToolStatus') {
				await postToolStatus(webviewView, this.graphifyDriver, this.grepaiDriver, this.ollamaDriver);
				return;
			}

			if (message?.type === 'installGraphify') {
				await handleInstallGraphify(webviewView, this.graphifyDriver);
				return;
			}

			if (message?.type === 'installGrepai') {
				await handleInstallGrepai(webviewView, this.grepaiDriver);
				return;
			}

			if (message?.type === 'installOllama') {
				await handleInstallOllama(webviewView, this.ollamaDriver);
				return;
			}
		});
	}
}
