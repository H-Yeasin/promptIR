import { execFile, type ExecFileException } from 'child_process';

export interface ExecWithTimeoutOptions {
	cwd: string;
	timeoutMs: number;
}

/**
 * Generic, injectable-command process runner shared by the tool detectors
 * (grepai, Ollama, ...). Always execFile, never a shell - callers pass fixed,
 * non-user-controlled argv so there is no injection surface.
 */
export function execWithTimeout(command: string, args: string[], options: ExecWithTimeoutOptions): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(command, args, {
			cwd: options.cwd,
			timeout: options.timeoutMs,
			windowsHide: true,
			maxBuffer: 5 * 1024 * 1024
		}, (error: ExecFileException | null, stdout: string) => {
			if (error) {
				reject(error instanceof Error ? error : new Error(error.message));
				return;
			}

			resolve(stdout);
		});
	});
}

export async function isCommandOnPath(command: string, cwd: string, timeoutMs = 3000): Promise<boolean> {
	try {
		await execWithTimeout(command, ['--version'], { cwd, timeoutMs });
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code !== 'ENOENT';
	}
}
