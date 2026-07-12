import * as assert from 'assert';
import { mergeSemanticAndKeywordFiles } from '../../context/contextGatherer';
import type { ContextFile } from '../../context/contextTypes';

suite('PromptIR Context Gatherer', () => {
	test('mergeSemanticAndKeywordFiles prefers the semantic snippet for overlapping files', () => {
		const semanticFiles: ContextFile[] = [
			{ fileName: 'shared.ts', languageId: 'typescript', text: 'semantic snippet', score: 100.9 }
		];
		const keywordFiles: ContextFile[] = [
			{ fileName: 'shared.ts', languageId: 'typescript', text: 'whole file contents', score: 6 },
			{ fileName: 'other.ts', languageId: 'typescript', text: 'other file', score: 4 }
		];

		const merged = mergeSemanticAndKeywordFiles(semanticFiles, keywordFiles);

		assert.strictEqual(merged.length, 2);

		const sharedEntry = merged.find(file => file.fileName === 'shared.ts');
		assert.strictEqual(sharedEntry?.text, 'semantic snippet');

		const otherEntry = merged.find(file => file.fileName === 'other.ts');
		assert.strictEqual(otherEntry?.text, 'other file');
	});

	test('mergeSemanticAndKeywordFiles keeps non-overlapping files from both sources', () => {
		const semanticFiles: ContextFile[] = [
			{ fileName: 'a.ts', languageId: 'typescript', text: 'a', score: 100 }
		];
		const keywordFiles: ContextFile[] = [
			{ fileName: 'b.ts', languageId: 'typescript', text: 'b', score: 3 }
		];

		const merged = mergeSemanticAndKeywordFiles(semanticFiles, keywordFiles);

		assert.strictEqual(merged.length, 2);
		assert.ok(merged.some(file => file.fileName === 'a.ts'));
		assert.ok(merged.some(file => file.fileName === 'b.ts'));
	});
});
