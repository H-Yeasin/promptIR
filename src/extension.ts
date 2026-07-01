import * as vscode from 'vscode';
import { registerChatParticipant } from './chat/chatParticipant';
import { registerCopyCommand } from './commands/copyCommand';
import { registerOptimizeCommand } from './commands/optimizeCommand';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		registerOptimizeCommand(context.extensionUri),
		registerCopyCommand(),
		registerChatParticipant()
	);
}

export function deactivate() {}
