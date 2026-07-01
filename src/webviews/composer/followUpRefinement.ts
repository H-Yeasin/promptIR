import type { FollowUpAnswer } from './composerTypes';

export function composeFollowUpRefinementPrompt(originalPrompt: string, answers: FollowUpAnswer[]): string {
	const trimmedOriginalPrompt = originalPrompt.trim();
	const answeredQuestions = answers
		.map(({ question, answer }) => ({
			question: question.trim(),
			answer: answer.trim()
		}))
		.filter(({ question, answer }) => question && answer);

	const sections = [
		'Create a refined, context-aware coding-agent prompt from the original goal and the user answers below.',
		trimmedOriginalPrompt
			? `Original goal:\n${trimmedOriginalPrompt}`
			: 'Original goal:\nThe user did not provide extra details before generating follow-up questions.'
	];

	if (answeredQuestions.length) {
		sections.push([
			'Clarifying answers:',
			...answeredQuestions.map(({ question, answer }, index) => [
				`${index + 1}. Question: ${question}`,
				`Answer: ${answer}`
			].join('\n'))
		].join('\n\n'));
	} else {
		sections.push('Clarifying answers:\nThe user did not answer any follow-up questions.');
	}

	sections.push('Use the answers to resolve ambiguity, preserve the original intent, and produce the final prompt the coding agent should follow.');

	return sections.join('\n\n');
}
