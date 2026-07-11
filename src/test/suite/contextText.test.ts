import * as assert from 'assert';
import { mergeContextFiles, truncateContext } from '../../context/contextText';
import type { ContextFile } from '../../context/contextTypes';

suite('PromptIR Context Text', () => {
	test('truncateContext leaves short text untouched', () => {
		assert.strictEqual(truncateContext('short text', 100), 'short text');
	});

	test('truncateContext truncates and appends a marker beyond the limit', () => {
		const text = 'a'.repeat(20);
		const truncated = truncateContext(text, 10);

		assert.ok(truncated.startsWith('a'.repeat(10)));
		assert.ok(truncated.includes('[PromptIR truncated this context at 10 characters.]'));
	});

	test('mergeContextFiles dedupes by filename keeping the higher score', () => {
		const files: ContextFile[] = [
			{ fileName: 'a.ts', languageId: 'typescript', text: 'low', score: 1 },
			{ fileName: 'a.ts', languageId: 'typescript', text: 'high', score: 5 },
			{ fileName: 'b.ts', languageId: 'typescript', text: 'b', score: 3 }
		];

		const merged = mergeContextFiles(files);

		assert.strictEqual(merged.length, 2);
		assert.strictEqual(merged[0].fileName, 'a.ts');
		assert.strictEqual(merged[0].text, 'high');
		assert.strictEqual(merged[1].fileName, 'b.ts');
	});

	test('mergeContextFiles caps at 8 entries sorted by score descending', () => {
		const files: ContextFile[] = Array.from({ length: 10 }, (_, index) => ({
			fileName: `file-${index}.ts`,
			languageId: 'typescript',
			text: '',
			score: index
		}));

		const merged = mergeContextFiles(files);

		assert.strictEqual(merged.length, 8);
		assert.strictEqual(merged[0].fileName, 'file-9.ts');
		assert.strictEqual(merged[7].fileName, 'file-2.ts');
	});
});
