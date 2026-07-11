import * as assert from 'assert';
import * as vscode from 'vscode';
import { formatSeverity, getDiagnosticPriority } from '../../context/diagnostics';

suite('PromptIR Diagnostics', () => {
	test('formatSeverity maps known severities', () => {
		assert.strictEqual(formatSeverity(vscode.DiagnosticSeverity.Error), 'error');
		assert.strictEqual(formatSeverity(vscode.DiagnosticSeverity.Warning), 'warning');
		assert.strictEqual(formatSeverity(vscode.DiagnosticSeverity.Information), 'info');
		assert.strictEqual(formatSeverity(vscode.DiagnosticSeverity.Hint), 'hint');
	});

	test('formatSeverity falls back to "unknown" for unrecognized severities', () => {
		assert.strictEqual(formatSeverity(99 as vscode.DiagnosticSeverity), 'unknown');
	});

	test('getDiagnosticPriority ranks the active file above related files above other files', () => {
		const activePriority = getDiagnosticPriority('/a.ts', '/a.ts', new Set(), 'promptAware');
		const relatedPriority = getDiagnosticPriority('/b.ts', '/a.ts', new Set(['/b.ts']), 'promptAware');
		const otherPriority = getDiagnosticPriority('/c.ts', '/a.ts', new Set(['/b.ts']), 'promptAware');

		assert.ok(activePriority > relatedPriority);
		assert.ok(relatedPriority > otherPriority);
		assert.ok(otherPriority > 0);
	});

	test('getDiagnosticPriority boosts active/related files further under diagnosticsFocused', () => {
		const focused = getDiagnosticPriority('/a.ts', '/a.ts', new Set(), 'diagnosticsFocused');
		const promptAware = getDiagnosticPriority('/a.ts', '/a.ts', new Set(), 'promptAware');

		assert.ok(focused > promptAware);
	});
});
