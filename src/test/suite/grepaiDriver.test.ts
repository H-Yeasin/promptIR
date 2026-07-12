import * as assert from 'assert';
import * as path from 'path';
import { parseGrepaiHits, runGrepaiCommand } from '../../grepaiDriver';

suite('PromptIR Grepai Driver', () => {
	test('parseGrepaiHits parses a valid compact JSON payload', () => {
		const workspaceRoot = path.join('workspace', 'root');
		const stdout = JSON.stringify([
			{ file: 'src/auth/refreshToken.ts', startLine: 10, endLine: 24, score: 0.87 }
		]);

		const hits = parseGrepaiHits(stdout, workspaceRoot);

		assert.ok(hits);
		assert.strictEqual(hits?.length, 1);
		assert.strictEqual(hits?.[0].file, path.join(workspaceRoot, 'src/auth/refreshToken.ts'));
		assert.strictEqual(hits?.[0].startLine, 10);
		assert.strictEqual(hits?.[0].endLine, 24);
		assert.strictEqual(hits?.[0].score, 0.87);
	});

	test('parseGrepaiHits tolerates unknown extra fields and wrapped result shapes', () => {
		const workspaceRoot = path.join('workspace', 'root');
		const stdout = JSON.stringify({
			results: [
				{ path: 'src/foo.ts', line: 5, extraField: 'ignored' }
			],
			meta: { tookMs: 12 }
		});

		const hits = parseGrepaiHits(stdout, workspaceRoot);

		assert.ok(hits);
		assert.strictEqual(hits?.length, 1);
		assert.strictEqual(hits?.[0].file, path.join(workspaceRoot, 'src/foo.ts'));
		assert.strictEqual(hits?.[0].startLine, 5);
		assert.strictEqual(hits?.[0].endLine, 5);
	});

	test('parseGrepaiHits returns null for malformed JSON', () => {
		const hits = parseGrepaiHits('not valid json {{{', path.join('workspace', 'root'));

		assert.strictEqual(hits, null);
	});

	test('parseGrepaiHits returns null when the payload has no recognizable hit list', () => {
		const hits = parseGrepaiHits(JSON.stringify({ status: 'ok' }), path.join('workspace', 'root'));

		assert.strictEqual(hits, null);
	});

	test('parseGrepaiHits returns an empty array for empty stdout', () => {
		const hits = parseGrepaiHits('   ', path.join('workspace', 'root'));

		assert.deepStrictEqual(hits, []);
	});

	test('runGrepaiCommand rejects and kills the process once the timeout elapses', async () => {
		const start = Date.now();

		await assert.rejects(() => runGrepaiCommand(
			process.execPath,
			['-e', 'setTimeout(() => {}, 5000)'],
			{ cwd: process.cwd(), timeoutMs: 200 }
		));

		const elapsedMs = Date.now() - start;
		assert.ok(elapsedMs < 4000, `expected the timeout to cut the process short, but it took ${elapsedMs}ms`);
	});
});
