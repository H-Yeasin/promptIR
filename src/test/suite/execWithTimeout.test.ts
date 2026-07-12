import * as assert from 'assert';
import { execWithTimeout } from '../../utils/execWithTimeout';

suite('PromptIR Exec With Timeout', () => {
	test('rejects and kills the process once the timeout elapses', async () => {
		const start = Date.now();

		await assert.rejects(() => execWithTimeout(
			process.execPath,
			['-e', 'setTimeout(() => {}, 5000)'],
			{ cwd: process.cwd(), timeoutMs: 200 }
		));

		const elapsedMs = Date.now() - start;
		assert.ok(elapsedMs < 4000, `expected the timeout to cut the process short, but it took ${elapsedMs}ms`);
	});

	test('resolves with stdout on success', async () => {
		const output = await execWithTimeout(
			process.execPath,
			['-e', 'process.stdout.write("hello")'],
			{ cwd: process.cwd(), timeoutMs: 5000 }
		);

		assert.strictEqual(output, 'hello');
	});
});
