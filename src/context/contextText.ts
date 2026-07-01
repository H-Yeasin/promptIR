import type { ContextFile } from './contextTypes';

export function truncateContext(text: string, maxChars = 8000): string {
	if (text.length <= maxChars) {
		return text;
	}

	return `${text.slice(0, maxChars).trimEnd()}\n\n[PromptIR truncated this context at ${maxChars} characters.]`;
}

export function mergeContextFiles(files: ContextFile[]): ContextFile[] {
	const byName = new Map<string, ContextFile>();

	for (const file of files) {
		const existing = byName.get(file.fileName);

		if (!existing || file.score > existing.score) {
			byName.set(file.fileName, file);
		}
	}

	return Array.from(byName.values())
		.sort((left, right) => right.score - left.score)
		.slice(0, 8);
}
