# PromptIR

PromptIR turns rough developer intent into context-aware prompts for coding agents. It reads the active editor, optional selection, related workspace files, and VS Code diagnostics, then generates a focused prompt you can paste into Codex, Claude, Copilot, or another agent.

## Features

Use **PromptIR: Optimize Prompt with Context** to open the Composer.

The Composer includes the first batch of one-click intent presets:

- **Optimize Prompt**: rewrite a rough goal into a richer agent prompt.
- **Analyze Current Problems**: use VS Code Problems diagnostics and related files to prepare a focused debugging/fix prompt.
- **Explain This File**: explain the active file or selected code, including responsibilities, dependencies, and risks.
- **Refactor Safely**: prepare a behavior-preserving cleanup prompt with testing expectations.
- **Ask Follow-Up Questions**: produce 3-5 clarifying questions instead of a full agent prompt.
- **Review For Bugs**: prepare a code-review style prompt focused on correctness, edge cases, regressions, security, and missing tests.
- **Improve UI/UX**: gather component, page, style, and theme context for polished user-facing improvements.
- **Summarize Workspace Context**: create a compact project map that can be pasted into an external agent.
- **Security/Performance Pass**: prepare a risk-focused review prompt for unsafe inputs, auth, async behavior, expensive paths, and missing tests.
- **Diagnose Build Failure**: combine pasted terminal/build/test output with diagnostics and related files.
- **Prepare Implementation Plan**: create a planning-only prompt that asks the agent not to edit code yet.

Automatic terminal capture is planned for a later version. For now, paste build or test output into the Composer when using **Diagnose Build Failure**.

## Requirements

PromptIR uses VS Code language model access through Copilot. You need an authorized Copilot language model available in VS Code.

## Extension Settings

This extension does not currently contribute settings.

## Known Issues

The Chat participant currently supports the optimize flow only. Preset support is available through the Composer.

## Release Notes

### 0.0.1

Initial PromptIR Composer with context-aware prompt optimization and built-in intent presets.
