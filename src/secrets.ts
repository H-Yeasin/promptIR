import * as vscode from 'vscode';

const OPENAI_KEY = 'promptir.openaiApiKey';

let secretStorage: vscode.SecretStorage | undefined;

export function initSecrets(context: vscode.ExtensionContext): void {
	secretStorage = context.secrets;
}

export async function getOpenAiApiKey(): Promise<string> {
	return (await secretStorage?.get(OPENAI_KEY)) ?? '';
}

export async function setOpenAiApiKey(value: string): Promise<void> {
	if (value) {
		await secretStorage?.store(OPENAI_KEY, value);
	} else {
		await secretStorage?.delete(OPENAI_KEY);
	}
}

export async function migrateOpenAiApiKeyFromSettings(): Promise<void> {
	const config = vscode.workspace.getConfiguration('promptir');
	const legacyKey = config.get<string>('openaiApiKey');

	if (!legacyKey) {
		return;
	}

	const existingSecret = await getOpenAiApiKey();

	if (!existingSecret) {
		await setOpenAiApiKey(legacyKey);
	}

	await config.update('openaiApiKey', undefined, vscode.ConfigurationTarget.Global);
}
