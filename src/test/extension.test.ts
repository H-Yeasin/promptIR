import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	test('activates and registers PromptIR commands', async () => {
		const extension = vscode.extensions.getExtension('habibUllahYeasin.promptir');

		assert.ok(extension, 'PromptIR extension should be discoverable by the test host.');

		await extension.activate();

		const commands = await vscode.commands.getCommands(true);

		assert.ok(commands.includes('promptir.optimize'));
		assert.ok(commands.includes('promptir.copyToClipboard'));
		assert.ok(commands.includes('promptir.openSidebar'));
	});
});
