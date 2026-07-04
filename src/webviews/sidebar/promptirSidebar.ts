import * as vscode from 'vscode';
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
			await vscode.commands.executeCommand(`${viewId}.focus`);
		})
	];
}
