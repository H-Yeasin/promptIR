import * as assert from 'assert';
import {
	AVAILABLE_PRESETS,
	getPromptForPreset,
	getPromptPreset
} from '../../presets/promptPresets';

suite('PromptIR Presets', () => {
	test('all presets have unique ids', () => {
		const ids = AVAILABLE_PRESETS.map(preset => preset.id);
		const uniqueIds = new Set(ids);

		assert.strictEqual(uniqueIds.size, ids.length);
	});

	test('specific presets resolve expected context strategies', () => {
		assert.strictEqual(getPromptPreset('reviewBugs').contextStrategy, 'activeFileAndRelatedFiles');
		assert.strictEqual(getPromptPreset('analyzeProblems').contextStrategy, 'diagnosticsFocused');
		assert.strictEqual(getPromptPreset('summarizeWorkspace').contextStrategy, 'workspaceSummary');
		assert.strictEqual(getPromptPreset('diagnoseBuildFailure').contextStrategy, 'buildFailureFocused');
	});

	test('blank input resolves to useful default goals', () => {
		for (const preset of AVAILABLE_PRESETS) {
			const fallbackGoal = getPromptForPreset('', preset);

			assert.ok(fallbackGoal.length >= 20, `${preset.id} should have a descriptive fallback goal.`);
			assert.notStrictEqual(fallbackGoal, preset.label);
		}
	});
});
