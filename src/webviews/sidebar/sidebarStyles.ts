export const sidebarStyles = /* css */ `		:root {
			color-scheme: light dark;
		}

		* {
			box-sizing: border-box;
		}

		html,
		body {
			height: 100%;
			margin: 0;
		}

		body {
			color: var(--vscode-foreground);
			background: var(--vscode-sideBar-background);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}

		.shell {
			display: flex;
			flex-direction: column;
			height: 100%;
			min-width: 0;
		}

		header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 10px;
			min-height: 44px;
			padding: 9px 12px;
			border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			background: var(--vscode-sideBar-background);
		}

		.brand {
			display: flex;
			align-items: center;
			gap: 9px;
			min-width: 0;
		}

		.logo {
			width: 24px;
			height: 24px;
			flex: 0 0 auto;
			border-radius: 5px;
		}

		h1 {
			margin: 0;
			font-size: 13px;
			font-weight: 600;
			line-height: 1.3;
		}

		.header-subtitle {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			line-height: 1.25;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.state-chip {
			display: inline-flex;
			align-items: center;
			gap: 5px;
			flex: 0 0 auto;
			max-width: 86px;
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.state-dot {
			width: 7px;
			height: 7px;
			flex: 0 0 auto;
			border-radius: 999px;
			background: var(--vscode-testing-iconPassed);
		}

		.state-chip.busy .state-dot {
			background: var(--vscode-progressBar-background);
		}

		.state-chip.error .state-dot {
			background: var(--vscode-errorForeground);
		}

		.header-actions {
			display: flex;
			align-items: center;
			gap: 8px;
			min-width: 0;
		}

		.header-actions button {
			width: auto;
			min-height: 26px;
			padding: 4px 8px;
			font-size: 11px;
		}

		.messages {
			display: flex;
			flex: 1 1 auto;
			flex-direction: column;
			gap: 12px;
			min-height: 0;
			overflow-y: auto;
			padding: 14px 12px 12px;
			scrollbar-gutter: stable;
		}

		.message {
			display: grid;
			grid-template-columns: 22px minmax(0, 1fr);
			gap: 8px;
			align-items: start;
		}

		.avatar {
			display: grid;
			width: 22px;
			height: 22px;
			place-items: center;
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 5px;
			color: var(--vscode-descriptionForeground);
			background: var(--vscode-input-background);
			font-size: 11px;
			font-weight: 700;
		}

		.avatar svg {
			width: 14px;
			height: 14px;
		}

		.bubble {
			min-width: 0;
			border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			border-radius: 7px;
			padding: 9px 10px;
			background: var(--vscode-editorWidget-background);
			white-space: pre-wrap;
			overflow-wrap: anywhere;
			line-height: 1.45;
		}

		.bubble.markdown-preview {
			white-space: normal;
		}

		.bubble.markdown-preview h1,
		.bubble.markdown-preview h2,
		.bubble.markdown-preview h3 {
			margin: 0 0 8px;
			font-size: 13px;
			line-height: 1.35;
		}

		.bubble.markdown-preview p,
		.bubble.markdown-preview ul,
		.bubble.markdown-preview ol,
		.bubble.markdown-preview pre {
			margin: 0 0 9px;
		}

		.bubble.markdown-preview ul,
		.bubble.markdown-preview ol {
			padding-left: 18px;
		}

		.bubble.markdown-preview li {
			margin: 3px 0;
		}

		.bubble.markdown-preview code {
			border-radius: 3px;
			padding: 1px 3px;
			background: var(--vscode-textCodeBlock-background);
			font-family: var(--vscode-editor-font-family);
			font-size: 0.95em;
		}

		.bubble.markdown-preview pre {
			overflow-x: auto;
			border-radius: 5px;
			padding: 8px;
			background: var(--vscode-textCodeBlock-background);
		}

		.bubble.markdown-preview pre code {
			padding: 0;
			background: transparent;
		}

		.response-actions {
			display: flex;
			justify-content: flex-end;
			gap: 7px;
			margin-top: 10px;
			padding-top: 8px;
			border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
		}

		.response-actions button {
			width: auto;
			min-height: 26px;
			padding: 4px 8px;
			font-size: 11px;
		}

		.response-editor {
			width: 100%;
			min-height: 220px;
			max-height: 52vh;
			margin: 0;
		}

		.message.user .bubble {
			background: var(--vscode-input-background);
		}

		.message.error .bubble {
			border-color: var(--vscode-inputValidation-errorBorder);
			color: var(--vscode-inputValidation-errorForeground, var(--vscode-foreground));
			background: var(--vscode-inputValidation-errorBackground);
		}

		.message.thinking .bubble {
			color: var(--vscode-descriptionForeground);
		}

		.typing {
			display: inline-flex;
			gap: 4px;
			align-items: center;
		}

		.typing span {
			width: 5px;
			height: 5px;
			border-radius: 999px;
			background: currentColor;
			opacity: 0.45;
			animation: pulse 1s ease-in-out infinite;
		}

		.typing span:nth-child(2) {
			animation-delay: 0.12s;
		}

		.typing span:nth-child(3) {
			animation-delay: 0.24s;
		}

		@keyframes pulse {
			0%, 100% {
				transform: translateY(0);
				opacity: 0.35;
			}

			50% {
				transform: translateY(-2px);
				opacity: 0.85;
			}
		}

		.composer {
			display: flex;
			flex: 0 0 auto;
			flex-direction: column;
			gap: 9px;
			border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			padding: 10px 12px 12px;
			background: var(--vscode-sideBar-background);
		}

		.preset-meta {
			display: grid;
			gap: 3px;
			min-width: 0;
			padding: 8px 9px;
			border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			border-radius: 7px;
			background: var(--vscode-editorWidget-background);
		}

		.preset-title {
			font-size: 12px;
			font-weight: 600;
			line-height: 1.35;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.preset-description {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			line-height: 1.35;
			overflow-wrap: anywhere;
		}

		select,
		textarea,
		button {
			width: 100%;
			font: inherit;
		}

		select,
		textarea {
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 4px;
			color: var(--vscode-input-foreground);
			background: var(--vscode-input-background);
			outline: none;
		}

		select:focus,
		textarea:focus,
		button:focus-visible {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: 1px;
		}

		select {
			height: 32px;
			padding: 4px 8px;
		}

		textarea {
			min-height: 92px;
			max-height: 32vh;
			padding: 9px 10px;
			resize: vertical;
			font-family: var(--vscode-editor-font-family);
			font-size: 12px;
			line-height: 1.4;
		}

		.actions {
			display: grid;
			grid-template-columns: auto 1fr auto;
			gap: 8px;
		}

		button {
			border: 0;
			border-radius: 5px;
			min-height: 30px;
			padding: 6px 10px;
			color: var(--vscode-button-foreground);
			background: var(--vscode-button-background);
			cursor: pointer;
			white-space: nowrap;
		}

		button:hover {
			background: var(--vscode-button-hoverBackground);
		}

		button.secondary {
			color: var(--vscode-button-secondaryForeground);
			background: var(--vscode-button-secondaryBackground);
		}

		button.secondary:hover {
			background: var(--vscode-button-secondaryHoverBackground);
		}

		.icon-button {
			width: 32px;
			padding: 0;
			font-size: 15px;
		}

		button:disabled {
			cursor: not-allowed;
			opacity: 0.55;
		}

		.status {
			min-height: 16px;
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			line-height: 1.35;
		}

		.status.error {
			color: var(--vscode-errorForeground);
		}

		.follow-up-form {
			display: grid;
			gap: 10px;
			margin-top: 12px;
			padding-top: 10px;
			border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			white-space: normal;
		}

		.follow-up-item {
			display: grid;
			gap: 6px;
		}

		.follow-up-question {
			font-size: 12px;
			font-weight: 600;
			line-height: 1.35;
		}

		.follow-up-answer {
			min-height: 54px;
			max-height: 120px;
			font-family: var(--vscode-editor-font-family);
			font-size: 12px;
		}

		.follow-up-actions {
			display: grid;
			grid-template-columns: 1fr auto;
			gap: 8px;
			align-items: center;
		}

		.follow-up-actions button {
			width: auto;
		}

		.follow-up-note {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			line-height: 1.35;
		}

		.settings-panel {
			display: none;
			flex-direction: column;
			gap: 12px;
			padding: 12px;
			background: var(--vscode-editorWidget-background);
			border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
		}
		.settings-panel.open {
			display: flex;
		}
		.settings-panel label {
			font-size: 11px;
			font-weight: 600;
			display: flex;
			flex-direction: column;
			gap: 4px;
		}
		.settings-panel input[type="password"] {
			width: 100%;
			border: 1px solid var(--vscode-input-border, transparent);
			border-radius: 4px;
			color: var(--vscode-input-foreground);
			background: var(--vscode-input-background);
			height: 28px;
			padding: 4px 8px;
			outline: none;
			font-family: inherit;
		}
		.settings-panel input[type="password"]:focus {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: 1px;
		}
		.settings-status {
			color: var(--vscode-testing-iconPassed);
			font-size: 11px;
			min-height: 14px;
		}

		.tools-panel {
			display: none;
			flex-direction: column;
			gap: 10px;
			padding: 12px;
			background: var(--vscode-editorWidget-background);
			border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
		}
		.tools-panel.open {
			display: flex;
		}
		.tools-intro {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			line-height: 1.35;
		}
		.tool-row {
			display: flex;
			align-items: center;
			gap: 10px;
			padding: 9px 10px;
			border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
			border-radius: 7px;
			background: var(--vscode-input-background);
		}
		.tool-info {
			display: grid;
			gap: 3px;
			min-width: 0;
			flex: 1 1 auto;
		}
		.tool-name {
			font-size: 12px;
			font-weight: 600;
			line-height: 1.35;
		}
		.tool-description {
			color: var(--vscode-descriptionForeground);
			font-size: 11px;
			line-height: 1.35;
			overflow-wrap: anywhere;
		}
		.tool-status {
			font-size: 11px;
			line-height: 1.35;
			color: var(--vscode-descriptionForeground);
		}
		.tool-status.ready {
			color: var(--vscode-testing-iconPassed);
		}
		.tool-status.warning {
			color: var(--vscode-notificationsWarningIcon-foreground, var(--vscode-editorWarning-foreground));
		}
		.tool-install {
			width: auto;
			flex: 0 0 auto;
			min-height: 26px;
			padding: 4px 10px;
			font-size: 11px;
		}`;
