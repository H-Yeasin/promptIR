import * as vscode from 'vscode';
import { registerChatParticipant } from './chat/chatParticipant';
import { registerCopyCommand } from './commands/copyCommand';
import { registerOptimizeCommand } from './commands/optimizeCommand';
import { registerPromptIRSidebar } from './webviews/sidebar/promptirSidebar';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		registerOptimizeCommand(context.extensionUri),
		registerCopyCommand(),
		registerChatParticipant(),
		...registerPromptIRSidebar(context.extensionUri)
	);
}

export function deactivate() {}
