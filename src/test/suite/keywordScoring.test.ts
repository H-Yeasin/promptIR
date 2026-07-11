import * as assert from 'assert';
import * as vscode from 'vscode';
import { extractKeywords, scoreFile, scoreSummaryFile } from '../../context/keywordScoring';

suite('PromptIR Keyword Scoring', () => {
	test('extractKeywords filters stop words and dedups', () => {
		const keywords = extractKeywords('Please update the login controller for the user and the session and the session');

		assert.ok(keywords.includes('login'));
		assert.ok(keywords.includes('controller'));
		assert.ok(keywords.includes('session'));
		assert.ok(!keywords.includes('the'));
		assert.ok(!keywords.includes('and'));
		assert.strictEqual(new Set(keywords).size, keywords.length);
	});

	test('scoreFile matches whole path segments, not substrings', () => {
		const catUri = vscode.Uri.file('/workspace/src/cat.ts');
		const categoryUri = vscode.Uri.file('/workspace/src/category.ts');

		const catScore = scoreFile(catUri, ['cat'], '');
		const categoryScore = scoreFile(categoryUri, ['cat'], '');

		assert.ok(catScore > 0, 'a file literally named "cat" should score above zero for keyword "cat"');
		assert.strictEqual(categoryScore, 0, '"category.ts" should not match the keyword "cat"');
	});

	test('scoreFile gives a bonus for the active file', () => {
		const uri = vscode.Uri.file('/workspace/src/active.ts');

		assert.strictEqual(scoreFile(uri, [], uri.fsPath), 1);
		assert.strictEqual(scoreFile(uri, [], '/workspace/src/other.ts'), 0);
	});

	test('scoreSummaryFile gives a bonus for the active file', () => {
		const uri = vscode.Uri.file('/workspace/active.ts');

		assert.strictEqual(scoreSummaryFile(uri, [], uri.fsPath), 8);
		assert.strictEqual(scoreSummaryFile(uri, [], '/workspace/other.ts'), 0);
	});

	test('scoreSummaryFile keyword matching also respects word boundaries', () => {
		const readUri = vscode.Uri.file('/workspace/src/read.ts');
		const readmeUri = vscode.Uri.file('/workspace/readme-notes.ts');

		const readScore = scoreSummaryFile(readUri, ['read'], '');
		const readmeScore = scoreSummaryFile(readmeUri, ['read'], '');

		assert.ok(readScore > 0);
		assert.strictEqual(readmeScore, 0, '"readme-notes.ts" should not match the keyword "read"');
	});
});
