export const sidebarScript = /* javascript */ `		const vscode = acquireVsCodeApi();
		const messages = document.getElementById('messages');
		const preset = document.getElementById('preset');
		const promptInput = document.getElementById('prompt');
		const generateButton = document.getElementById('generate');
		const copyButton = document.getElementById('copy');
		const clearButton = document.getElementById('clear');
		const clearRecentButton = document.getElementById('clearRecent');
		const status = document.getElementById('status');
		const stateChip = document.getElementById('stateChip');
		const stateLabel = document.getElementById('stateLabel');
		const presetTitle = document.getElementById('presetTitle');
		const presetDescription = document.getElementById('presetDescription');

		const toggleSettings = document.getElementById('toggleSettings');
		const settingsPanel = document.getElementById('settingsPanel');
		const aiProvider = document.getElementById('aiProvider');
		const openaiKeyLabel = document.getElementById('openaiKeyLabel');
		const openaiApiKey = document.getElementById('openaiApiKey');
		const settingsStatus = document.getElementById('settingsStatus');

		let currentResponse = '';
		let responseNode;
		let activePrompt = '';

		function appendMessage(text, className) {
			const node = document.createElement('div');
			node.className = 'message' + (className ? ' ' + className : '');
			const avatar = document.createElement('div');
			avatar.className = 'avatar';
			avatar.textContent = className === 'user' ? 'Y' : 'P';
			const bubble = document.createElement('div');
			bubble.className = 'bubble';
			bubble.textContent = text;
			node.append(avatar, bubble);
			messages.appendChild(node);
			messages.scrollTop = messages.scrollHeight;
			return bubble;
		}

		function appendThinkingMessage() {
			const node = document.createElement('div');
			node.className = 'message assistant thinking';
			const avatar = document.createElement('div');
			avatar.className = 'avatar';
			avatar.textContent = 'P';
			const bubble = document.createElement('div');
			bubble.className = 'bubble';
			const typing = document.createElement('span');
			typing.className = 'typing';
			typing.setAttribute('aria-label', 'Generating');
			typing.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));
			bubble.appendChild(typing);
			node.append(avatar, bubble);
			messages.appendChild(node);
			messages.scrollTop = messages.scrollHeight;
			return bubble;
		}

		function appendInlineMarkdown(target, text) {
			const pattern = /(\`[^\`]+\`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
			let cursor = 0;

			for (const match of text.matchAll(pattern)) {
				if (match.index > cursor) {
					target.appendChild(document.createTextNode(text.slice(cursor, match.index)));
				}

				const token = match[0];
				const element = document.createElement(token.startsWith('\`') ? 'code' : token.startsWith('**') || token.startsWith('__') ? 'strong' : 'em');
				element.textContent = token.replace(/^(\`|\*\*|__|\*|_)|(\`|\*\*|__|\*|_)$/g, '');
				target.appendChild(element);
				cursor = match.index + token.length;
			}

			if (cursor < text.length) {
				target.appendChild(document.createTextNode(text.slice(cursor)));
			}
		}

		function renderMarkdownPreview(target, text) {
			target.replaceChildren();
			target.classList.add('markdown-preview');

			const lines = text.split(/\\r?\\n/);
			let index = 0;

			while (index < lines.length) {
				const line = lines[index];
				const trimmed = line.trim();

				if (!trimmed) {
					index++;
					continue;
				}

				if (trimmed.startsWith('\`\`\`')) {
					const codeLines = [];
					index++;
					while (index < lines.length && !lines[index].trim().startsWith('\`\`\`')) {
						codeLines.push(lines[index]);
						index++;
					}
					index++;
					const pre = document.createElement('pre');
					const code = document.createElement('code');
					code.textContent = codeLines.join('\\n');
					pre.appendChild(code);
					target.appendChild(pre);
					continue;
				}

				const heading = trimmed.match(/^(#{1,3})\\s+(.+)$/);
				if (heading) {
					const node = document.createElement('h' + heading[1].length);
					appendInlineMarkdown(node, heading[2]);
					target.appendChild(node);
					index++;
					continue;
				}

				const bullet = trimmed.match(/^[-*]\\s+(.+)$/);
				if (bullet) {
					const list = document.createElement('ul');
					while (index < lines.length) {
						const itemMatch = lines[index].trim().match(/^[-*]\\s+(.+)$/);
						if (!itemMatch) {
							break;
						}
						const item = document.createElement('li');
						appendInlineMarkdown(item, itemMatch[1]);
						list.appendChild(item);
						index++;
					}
					target.appendChild(list);
					continue;
				}

				const numbered = trimmed.match(/^\\d+[.)]\\s+(.+)$/);
				if (numbered) {
					const list = document.createElement('ol');
					while (index < lines.length) {
						const itemMatch = lines[index].trim().match(/^\\d+[.)]\\s+(.+)$/);
						if (!itemMatch) {
							break;
						}
						const item = document.createElement('li');
						appendInlineMarkdown(item, itemMatch[1]);
						list.appendChild(item);
						index++;
					}
					target.appendChild(list);
					continue;
				}

				const paragraphLines = [];
				while (index < lines.length && lines[index].trim()) {
					paragraphLines.push(lines[index].trim());
					index++;
				}
				const paragraph = document.createElement('p');
				appendInlineMarkdown(paragraph, paragraphLines.join(' '));
				target.appendChild(paragraph);
			}
		}

		function addResponseActions(target) {
			const actions = document.createElement('div');
			actions.className = 'response-actions';
			const editButton = document.createElement('button');
			editButton.className = 'secondary';
			editButton.type = 'button';
			editButton.textContent = 'Edit';
			editButton.addEventListener('click', () => showResponseEditor(target));
			actions.appendChild(editButton);
			target.appendChild(actions);
		}

		function showResponsePreview(target, text) {
			renderMarkdownPreview(target, text);
			addResponseActions(target);
		}

		function showResponseEditor(target) {
			const original = currentResponse;
			target.classList.remove('markdown-preview');
			target.replaceChildren();

			const editor = document.createElement('textarea');
			editor.className = 'response-editor';
			editor.value = currentResponse;
			const actions = document.createElement('div');
			actions.className = 'response-actions';
			const previewButton = document.createElement('button');
			previewButton.type = 'button';
			previewButton.textContent = 'Preview';
			const saveButton = document.createElement('button');
			saveButton.type = 'button';
			saveButton.textContent = 'Save';
			const cancelButton = document.createElement('button');
			cancelButton.className = 'secondary';
			cancelButton.type = 'button';
			cancelButton.textContent = 'Cancel';

			previewButton.addEventListener('click', () => {
				currentResponse = editor.value;
				showResponsePreview(target, currentResponse);
				copyButton.disabled = !currentResponse;
			});
			saveButton.addEventListener('click', () => {
				currentResponse = editor.value;
				showResponsePreview(target, currentResponse);
				copyButton.disabled = !currentResponse;
				status.textContent = 'Edited prompt is ready.';
			});
			cancelButton.addEventListener('click', () => {
				currentResponse = original;
				showResponsePreview(target, currentResponse);
			});

			actions.append(previewButton, saveButton, cancelButton);
			target.append(editor, actions);
			editor.focus();
		}

		function extractQuestions(text) {
			const lines = text
				.split(/\\r?\\n/)
				.map(line => line.trim())
				.filter(Boolean);
			const numbered = lines
				.map(line => line.match(/^\\d+[.)]\\s*(.+)$/)?.[1]?.trim())
				.filter(Boolean);

			if (numbered.length) {
				return numbered;
			}

			return lines.filter(line => line.endsWith('?')).map(line => line.replace(/^[-*]\\s*/, ''));
		}

		function appendFollowUpForm(target, originalPrompt, generatedText) {
			const questions = extractQuestions(generatedText);

			if (!questions.length) {
				return;
			}

			const form = document.createElement('div');
			form.className = 'follow-up-form';

			for (const question of questions) {
				const item = document.createElement('label');
				item.className = 'follow-up-item';
				const questionText = document.createElement('span');
				questionText.className = 'follow-up-question';
				questionText.textContent = question;
				const answer = document.createElement('textarea');
				answer.className = 'follow-up-answer';
				answer.placeholder = 'Answer this question...';
				answer.dataset.question = question;
				item.append(questionText, answer);
				form.appendChild(item);
			}

			const actions = document.createElement('div');
			actions.className = 'follow-up-actions';
			const note = document.createElement('div');
			note.className = 'follow-up-note';
			note.textContent = 'Answer what matters, then create the final prompt.';
			const refineButton = document.createElement('button');
			refineButton.type = 'button';
			refineButton.textContent = 'Create Prompt';
			actions.append(note, refineButton);
			form.appendChild(actions);

			refineButton.addEventListener('click', () => {
				const answers = Array.from(form.querySelectorAll('textarea')).map(answer => ({
					question: answer.dataset.question || '',
					answer: answer.value
				}));
				const answered = answers.filter(answer => answer.answer.trim());

				appendMessage(answered.length
					? answered.map((answer, index) => (index + 1) + '. ' + answer.question + '\\n' + answer.answer.trim()).join('\\n\\n')
					: '(no follow-up answers)', 'user');
				currentResponse = '';
				responseNode = appendThinkingMessage();
				copyButton.disabled = true;
				status.className = 'status';
				status.textContent = 'Creating final prompt...';
				setState('Working', 'busy');
				setBusy(true);

				vscode.postMessage({
					type: 'refineFromFollowUp',
					originalPrompt,
					answers
				});
			});

			target.appendChild(form);
			form.querySelector('textarea')?.focus();
			messages.scrollTop = messages.scrollHeight;
		}

		function setState(label, className) {
			stateLabel.textContent = label;
			stateChip.className = 'state-chip' + (className ? ' ' + className : '');
		}

		function setBusy(isBusy) {
			generateButton.disabled = isBusy;
			preset.disabled = isBusy;
			promptInput.disabled = isBusy;
			clearButton.disabled = isBusy;
			clearRecentButton.disabled = isBusy;
		}

		function clearConversation(clearDraft) {
			messages.replaceChildren();
			currentResponse = '';
			responseNode = undefined;
			activePrompt = '';
			copyButton.disabled = true;
			status.className = 'status';
			status.textContent = 'Recent conversation cleared.';
			setState('Ready', '');
			appendMessage('Ready for the active editor.', 'assistant');

			if (clearDraft) {
				promptInput.value = '';
			}

			promptInput.focus();
		}

		function updatePresetText() {
			const selected = preset.options[preset.selectedIndex];
			promptInput.placeholder = selected?.dataset.placeholder || '';
			presetTitle.textContent = selected?.textContent || 'PromptIR';
			presetDescription.textContent = selected?.dataset.description || '';
			generateButton.textContent = selected?.dataset.action || 'Generate';
		}

		preset.addEventListener('change', updatePresetText);

		let saveTimeout;
		function saveSettings() {
			settingsStatus.textContent = 'Saving...';
			vscode.postMessage({
				type: 'saveSettings',
				aiProvider: aiProvider.value,
				openaiApiKey: openaiApiKey.value
			});
		}

		toggleSettings.addEventListener('click', () => {
			settingsPanel.classList.toggle('open');
		});

		aiProvider.addEventListener('change', () => {
			openaiKeyLabel.style.display = aiProvider.value === 'OpenAI' ? 'flex' : 'none';
			saveSettings();
		});

		openaiApiKey.addEventListener('input', () => {
			clearTimeout(saveTimeout);
			saveTimeout = setTimeout(saveSettings, 500);
		});

		function generate() {
			const prompt = promptInput.value.trim();
			const selectedPresetId = preset.value;

			activePrompt = prompt;
			appendMessage(prompt || '(no extra instructions)', 'user');
			currentResponse = '';
			responseNode = appendThinkingMessage();
			copyButton.disabled = true;
			status.className = 'status';
			status.textContent = 'Generating...';
			setState('Working', 'busy');
			setBusy(true);

			vscode.postMessage({
				type: 'generate',
				presetId: selectedPresetId,
				prompt
			});
		}

		generateButton.addEventListener('click', () => {
			generate();
		});

		promptInput.addEventListener('keydown', event => {
			if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !generateButton.disabled) {
				event.preventDefault();
				generate();
			}
		});

		copyButton.addEventListener('click', () => {
			if (!currentResponse) {
				return;
			}

			vscode.postMessage({
				type: 'copy',
				text: currentResponse
			});
		});

		clearButton.addEventListener('click', () => {
			clearConversation(false);
		});

		clearRecentButton.addEventListener('click', () => {
			clearConversation(true);
		});

		window.addEventListener('message', event => {
			const message = event.data;

			if (message.type === 'generationStarted') {
				status.textContent = message.label ? 'Generating with ' + message.label + '...' : 'Generating...';
				return;
			}

			if (message.type === 'fragment') {
				currentResponse += message.fragment;
				responseNode.classList.remove('markdown-preview');
				responseNode.textContent = currentResponse;
				messages.scrollTop = messages.scrollHeight;
				return;
			}

			if (message.type === 'complete') {
				currentResponse = message.prompt;
				showResponsePreview(responseNode, currentResponse);
				copyButton.disabled = false;
				if (message.presetId === 'askFollowUpQuestions') {
					copyButton.disabled = true;
					appendFollowUpForm(responseNode, activePrompt, currentResponse);
					status.textContent = 'Answer the follow-up questions to create the final prompt.';
				} else {
					status.textContent = message.copied ? 'Generated prompt copied to clipboard.' : 'Generated prompt is ready.';
				}
				setState('Ready', '');
				setBusy(false);
				return;
			}

			if (message.type === 'copied') {
				status.textContent = 'Copied to clipboard.';
				return;
			}

			if (message.type === 'error') {
				if (responseNode && !currentResponse) {
					responseNode.parentElement?.remove();
				}
				appendMessage(message.message || 'PromptIR failed.', 'error');
				status.className = 'status error';
				status.textContent = '';
				setState('Error', 'error');
				setBusy(false);
			}

			if (message.type === 'settingsSaved') {
				settingsStatus.textContent = 'Saved';
				setTimeout(() => {
					if (settingsStatus.textContent === 'Saved') {
						settingsStatus.textContent = '';
					}
				}, 2000);
			}
		});

		updatePresetText();`;
