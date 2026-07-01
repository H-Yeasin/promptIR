# PromptIR

PromptIR turns rough developer intent into context-aware prompts for coding agents. It reads the active editor, optional selection, related workspace files, and VS Code diagnostics, then generates a focused prompt you can paste into Codex, Claude, Copilot, or another agent.

## Features

Use **PromptIR: Optimize Prompt with Context** to open the Composer.

The Composer includes the first batch of one-click intent presets:

- **Optimize Prompt**: rewrite a rough goal into a richer agent prompt.
- **Explain This File**: explain the active file or selected code, including responsibilities, dependencies, and risks.
- **Refactor Safely**: prepare a behavior-preserving cleanup prompt with testing expectations.
- **Review For Bugs**: prepare a code-review style prompt focused on correctness, edge cases, regressions, security, and missing tests.
- **Prepare Implementation Plan**: create a planning-only prompt that asks the agent not to edit code yet.

More specialized presets such as diagnostics analysis, UI/UX improvement, workspace summaries, build-failure diagnosis, and security/performance passes are planned as follow-up phases.

## Requirements

PromptIR uses VS Code language model access through Copilot. You need an authorized Copilot language model available in VS Code.

## Extension Settings

This extension does not currently contribute settings.

## Known Issues

The Chat participant currently supports the optimize flow only. Preset support is available through the Composer.

## Release Notes

### 0.0.1

Initial PromptIR Composer with context-aware prompt optimization and built-in intent presets.
