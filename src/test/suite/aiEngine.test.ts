import * as assert from 'assert';
import { stripMarkdownFence } from '../../ai/aiEngine';

suite('PromptIR AI Engine', () => {
	test('stripMarkdownFence removes a labeled markdown fence', () => {
		assert.strictEqual(stripMarkdownFence('```markdown\nHello world\n```'), 'Hello world');
	});

	test('stripMarkdownFence removes a fence with no language tag', () => {
		assert.strictEqual(stripMarkdownFence('```\nHello world\n```'), 'Hello world');
	});

	test('stripMarkdownFence leaves unfenced text untouched', () => {
		assert.strictEqual(stripMarkdownFence('Hello world'), 'Hello world');
	});

	test('stripMarkdownFence leaves text with an unterminated fence untouched', () => {
		const text = '```markdown\nHello world';

		assert.strictEqual(stripMarkdownFence(text), text);
	});
});
