import * as vscode from 'vscode';
import { WorkspaceContext } from '../context/contextGatherer';
import { describePresetContext, PromptPreset, promptPresets } from '../presets/promptPresets';

import { OpenAI } from 'openai';

export interface PromptProcessingOptions {
	onFragment?: (fragment: string) => void;
}

export async function processPromptWithAI(
	rawPrompt: string,
	context: WorkspaceContext,
	preset: PromptPreset = promptPresets[0],
	options: PromptProcessingOptions = {}
): Promise<string> {
	const config = vscode.workspace.getConfiguration('promptir');
	const aiProvider = config.get<string>('aiProvider', 'Copilot');

	const systemInstruction = [
		'You are a Meta-Prompt Engineer.',
		preset.instruction,
		'Use the provided workspace context to make the optimized prompt specific and actionable.',
		'The context bundle may include active editor text, rule-retrieved files, and current VS Code diagnostics.',
		'Preserve the user intent and call out relevant files or selected code.',
		'Return only the optimized prompt text.',
		'Do not wrap the response in a Markdown code fence.',
		'Do not start with a title such as "Optimized Instructions".',
		'Use plain text with short sections and numbered steps only when they improve clarity.'
	].join(' ');

	const contextPayload = [
		`Raw goal:\n${rawPrompt}`,
		describePresetContext(context, preset),
		`Active file: ${context.fileName}`,
		`Language: ${context.languageId}`,
		`Active editor context:\n\`\`\`${context.languageId}\n${context.selectedText}\n\`\`\``,
		formatRelatedFiles(context),
		formatDiagnostics(context)
	].join('\n\n');

	let optimizedPrompt = '';

	if (aiProvider === 'OpenAI') {
		const apiKey = config.get<string>('openaiApiKey');
		const modelName = config.get<string>('openaiModel', 'gpt-4o');

		if (!apiKey) {
			throw new Error('OpenAI API key is missing. Please add it to the PromptIR settings.');
		}

		const openai = new OpenAI({ apiKey });
		const stream = await openai.chat.completions.create({
			model: modelName,
			messages: [
				{ role: 'system', content: systemInstruction },
				{ role: 'user', content: contextPayload }
			],
			stream: true,
		});

		for await (const chunk of stream) {
			const fragment = chunk.choices[0]?.delta?.content || '';
			optimizedPrompt += fragment;
			options.onFragment?.(fragment);
		}
	} else {
		const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
		const model = models[0];

		if (!model) {
			throw new Error('No authorized Copilot language model is available. Ensure GitHub Copilot is installed and active, or switch to the OpenAI provider in settings.');
		}

		const chatResponse = await model.sendRequest([
			vscode.LanguageModelChatMessage.User(systemInstruction),
			vscode.LanguageModelChatMessage.User(contextPayload)
		]);

		for await (const fragment of chatResponse.text) {
			optimizedPrompt += fragment;
			options.onFragment?.(fragment);
		}
	}

	return stripMarkdownFence(optimizedPrompt).trim();
}

function stripMarkdownFence(text: string): string {
	const trimmed = text.trim();
	const match = trimmed.match(/^```(?:markdown|md|text)?\s*\r?\n([\s\S]*?)\r?\n```$/i);

	return match?.[1] ?? text;
}

function formatRelatedFiles(context: WorkspaceContext): string {
	if (!context.relatedFiles?.length) {
		return 'Retrieved relevant workspace files: none.';
	}

	const files = context.relatedFiles.map(file => [
		`File: ${file.fileName}`,
		`Language: ${file.languageId}`,
		`Relevance score: ${file.score}`,
		`Snippet:\n\`\`\`${file.languageId}\n${file.text}\n\`\`\``
	].join('\n'));

	return [
		'Retrieved relevant workspace files:',
		...files
	].join('\n\n');
}

function formatDiagnostics(context: WorkspaceContext): string {
	if (!context.diagnostics?.length) {
		return 'Current VS Code diagnostics: none.';
	}

	const diagnostics = context.diagnostics.map(diagnostic => [
		`File: ${diagnostic.fileName}`,
		`Location: ${diagnostic.line}:${diagnostic.column}`,
		`Severity: ${diagnostic.severity}`,
		diagnostic.source ? `Source: ${diagnostic.source}` : undefined,
		`Message: ${diagnostic.message}`
	].filter(Boolean).join('\n'));

	return [
		'Current VS Code diagnostics:',
		...diagnostics
	].join('\n\n');
}
