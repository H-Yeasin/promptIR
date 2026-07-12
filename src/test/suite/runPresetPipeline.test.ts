import * as assert from 'assert';
import { buildAnchorFileNames } from '../../pipeline/runPresetPipeline';

suite('PromptIR Preset Pipeline', () => {
	test('buildAnchorFileNames unions active file, referenced files, and top semantic hits', () => {
		const anchors = buildAnchorFileNames(
			'/workspace/src/active.ts',
			['/workspace/src/referenced.ts'],
			['/workspace/src/hit1.ts', '/workspace/src/hit2.ts', '/workspace/src/hit3.ts', '/workspace/src/hit4.ts']
		);

		assert.deepStrictEqual(anchors, [
			'/workspace/src/active.ts',
			'/workspace/src/referenced.ts',
			'/workspace/src/hit1.ts',
			'/workspace/src/hit2.ts',
			'/workspace/src/hit3.ts'
		]);
	});

	test('buildAnchorFileNames deduplicates overlapping anchors across all three sources', () => {
		const anchors = buildAnchorFileNames(
			'/workspace/src/active.ts',
			['/workspace/src/active.ts', '/workspace/src/referenced.ts'],
			['/workspace/src/referenced.ts']
		);

		assert.deepStrictEqual(anchors, [
			'/workspace/src/active.ts',
			'/workspace/src/referenced.ts'
		]);
	});

	test('buildAnchorFileNames falls back to just the active file when no references or hits exist', () => {
		const anchors = buildAnchorFileNames('/workspace/src/active.ts');

		assert.deepStrictEqual(anchors, ['/workspace/src/active.ts']);
	});
});
