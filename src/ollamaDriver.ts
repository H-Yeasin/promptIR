import * as vscode from 'vscode';
import { isCommandOnPath } from './utils/execWithTimeout';

export type OllamaStatus = 'installed' | 'not-installed';

const CHECK_TIMEOUT_MS = 3000;
const OLLAMA_INSTALL_URL = 'https://ollama.com/download';

export class OllamaDriver {
	async detectOllama(): Promise<OllamaStatus> {
		const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
		const found = await isCommandOnPath('ollama', cwd, CHECK_TIMEOUT_MS);

		return found ? 'installed' : 'not-installed';
	}

	/**
	 * Ollama's own installer differs per platform (PowerShell script on Windows,
	 * a shell script or Homebrew on macOS/Linux); PromptIR sends the user to
	 * Ollama's official download page rather than guessing which to auto-run.
	 */
	async openInstallGuide(): Promise<void> {
		await vscode.env.openExternal(vscode.Uri.parse(OLLAMA_INSTALL_URL));
	}
}
