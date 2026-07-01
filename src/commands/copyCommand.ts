import * as vscode from 'vscode';

export function registerCopyCommand(): vscode.Disposable {
	return vscode.commands.registerCommand('promptir.copyToClipboard', async (text: string) => {
		await vscode.env.clipboard.writeText(text);
		vscode.window.showInformationMessage('PromptIR copied the generated prompt.');
	});
}
