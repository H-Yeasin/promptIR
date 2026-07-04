const fs = require('fs');

const content = fs.readFileSync('src/webviews/sidebar/promptirSidebar.ts', 'utf8');

const messageHandlersImports = `import * as vscode from 'vscode';
import { getActiveEditorContext } from '../../context/contextGatherer';
import { runPresetPipeline } from '../../pipeline/runPresetPipeline';
import { getPromptPreset } from '../../presets/promptPresets';
import { composeFollowUpRefinementPrompt } from '../composer/followUpRefinement';
import type { FollowUpAnswer } from '../composer/composerTypes';
`;

const sidebarMsgMatch = content.match(/type SidebarMessage =[\s\S]*?;/);
const sidebarMsgCode = 'export ' + sidebarMsgMatch[0];

const generateMatch = content.match(/private async generate\(webviewView: vscode\.WebviewView, message: SidebarMessage\): Promise<void> \{([\s\S]*?^\t\})/m);
const refineMatch = content.match(/private async refineFromFollowUp\(webviewView: vscode\.WebviewView, message: SidebarMessage\): Promise<void> \{([\s\S]*?^\t\})/m);

const messageHandlersCode = messageHandlersImports + '\n' + sidebarMsgCode + '\n\n' + 
'export async function handleGenerate(webviewView: vscode.WebviewView, message: SidebarMessage): Promise<void> {' + generateMatch[1] + '\n\n' + 
'export async function handleRefineFromFollowUp(webviewView: vscode.WebviewView, message: SidebarMessage): Promise<void> {' + refineMatch[1] + '\n';

fs.writeFileSync('src/webviews/sidebar/messageHandlers.ts', messageHandlersCode);

const htmlGeneratorImports = `import * as vscode from 'vscode';
import { AVAILABLE_PRESETS, getPromptPreset } from '../../presets/promptPresets';
import type { PromptPresetId } from '../../presets/promptPresets';
import { escapeHtml } from '../../utils/escape';
import { getNonce } from '../../utils/nonce';
`;

const htmlFuncMatch = content.match(/function getSidebarHtml\([\s\S]*/);
const htmlFuncCode = 'export ' + htmlFuncMatch[0];

const htmlGeneratorCode = htmlGeneratorImports + '\n' + htmlFuncCode;
fs.writeFileSync('src/webviews/sidebar/htmlGenerator.ts', htmlGeneratorCode);

const sidebarProviderCode = `import * as vscode from 'vscode';
import { getSidebarHtml } from './htmlGenerator';
import { handleGenerate, handleRefineFromFollowUp } from './messageHandlers';
import type { SidebarMessage } from './messageHandlers';

export class PromptIRSidebarProvider implements vscode.WebviewViewProvider {
	public constructor(private readonly extensionUri: vscode.Uri) {}

	public resolveWebviewView(webviewView: vscode.WebviewView): void {
		const mediaUri = vscode.Uri.joinPath(this.extensionUri, 'media');

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [mediaUri]
		};
		webviewView.webview.html = getSidebarHtml(webviewView.webview, mediaUri);

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
			}
		});
	}
}
`;
fs.writeFileSync('src/webviews/sidebar/sidebarProvider.ts', sidebarProviderCode);

const promptirSidebarCode = `import * as vscode from 'vscode';
import { PromptIRSidebarProvider } from './sidebarProvider';

const viewId = 'promptir.sidebar';

export function registerPromptIRSidebar(extensionUri: vscode.Uri): vscode.Disposable[] {
	const provider = new PromptIRSidebarProvider(extensionUri);

	return [
		vscode.window.registerWebviewViewProvider(viewId, provider, {
			webviewOptions: {
				retainContextWhenHidden: true
			}
		}),
		vscode.commands.registerCommand('promptir.openSidebar', async () => {
			await vscode.commands.executeCommand(\`\${viewId}.focus\`);
		})
	];
}
`;
fs.writeFileSync('src/webviews/sidebar/promptirSidebar.ts', promptirSidebarCode);
