# PromptIR

PromptIR is a context-aware prompt pre-compiler for Visual Studio Code. It turns rough developer intent into agent-ready prompts for tools such as Claude Code, Copilot, Gemini, Codex, and other coding assistants.

PromptIR gathers relevant workspace context from the active editor, optional selection, related files, VS Code diagnostics, and Graphify relationship maps when available. It then asks your selected AI provider to produce a focused prompt with clearer scope, file boundaries, verification steps, and architecture-aware constraints.

The goal is simple: stop paying the context tax.

## Core Idea

In compiler design, source code is usually transformed into an Intermediate Representation before final output. PromptIR applies that same idea to developer intent:

- **Human intent**: a short or messy request such as "fix this function" or "clean this module up".
- **PromptIR**: gathers local workspace signals, diagnostics, related files, and graph relationships.
- **Agent prompt**: a structured, context-rich instruction that gives downstream coding agents a better first attempt.

PromptIR does not replace coding agents. It prepares better instructions for them.

## Features

Use **PromptIR: Open Chatbox** to work from the sidebar, or **PromptIR: Optimize Prompt with Context** to open the Composer.

PromptIR includes these intent presets:

- **Optimize Prompt**: rewrites a rough goal into a detailed prompt with clean folder structure expectations, explicit file boundaries, ASCII directory-tree guidance, and readability constraints.
- **Prepare Implementation Plan**: creates a planning-only prompt that locks the downstream agent into Structural Planning Mode before code edits.
- **Ask Follow-Up Questions**: generates 3-5 clarifying questions before creating a final prompt.
- **Analyze Current Problems**: uses VS Code diagnostics to prepare a focused debugging prompt.
- **Diagnose Build Failure**: combines pasted build, test, or terminal output with workspace context.
- **Explain This File**: requests architecture, responsibilities, dependencies, data flow, risks, and a reading order.
- **Refactor Safely**: prepares behavior-preserving refactor prompts with testing expectations.
- **Review For Bugs**: creates code-review prompts focused on correctness, edge cases, regressions, security, and missing tests.
- **Improve UI/UX**: gathers component, style, and theme context for frontend improvement prompts.
- **Summarize Workspace Context**: creates a compact project map for external agents.
- **Security/Performance Pass**: prepares risk-focused prompts for unsafe input handling, auth, async behavior, expensive paths, and missing tests.

## Sidebar Workflow

The PromptIR sidebar is designed for repeated prompt refinement without leaving the editor:

- Choose a preset.
- Add raw instructions or constraints.
- Generate a context-aware prompt from editor, file, diagnostics, and Graphify context.
- Preview the generated prompt with lightweight Markdown rendering.
- Edit the generated prompt before copying it.
- Use follow-up question mode to answer clarifying questions and generate a final prompt.

Most presets copy the generated prompt automatically. Follow-up question mode waits until you answer the questions and create the final prompt.

## Graphify Context

PromptIR integrates with Graphify to add relationship-aware repository context when possible.

When Graphify is available, PromptIR can:

- Build or refresh `graphify-out/graph.json`.
- Add upstream dependencies and downstream dependents to the prompt context.
- Include connected files based on the active or prompt-referenced file.
- Fall back to editor, file, and diagnostics context if Graphify is missing or unavailable.

Graphify context is best-effort. PromptIR continues to work without it.

## AI Providers

PromptIR can generate prompts using:

- **GitHub Copilot** through the native VS Code Language Model API.
- **OpenAI** with your own API key.

To use OpenAI, open VS Code Settings, search for `PromptIR`, set **AI Provider** to `OpenAI`, and enter your API key.

## Settings

PromptIR contributes these settings:

| Setting Key | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `promptir.aiProvider` | `string` | `Copilot` | Choose `Copilot` or `OpenAI`. |
| `promptir.openaiApiKey` | `string` | empty | OpenAI API key when using the OpenAI provider. |
| `promptir.openaiModel` | `string` | `gpt-4o` | OpenAI model used for prompt generation. |
| `promptir.graphify.autoReindex` | `boolean` | `true` | Rebuild Graphify index files incrementally on text document saves. |
| `promptir.graphify.maxDepth` | `number` | `5` | Maximum number of connected Graphify nodes to include in context. |
| `promptir.maxContextChars` | `number` | `24000` | Maximum total characters of gathered context (active file, Graphify map, related files, diagnostics) sent to the AI provider per request. Lower this if your provider rejects requests for exceeding its message/token limit. |

## Privacy

PromptIR gathers workspace context locally inside VS Code before sending the selected prompt payload to your configured AI provider. If you use Copilot, generation goes through VS Code's language model API. If you use OpenAI, generation uses your configured OpenAI API key.

## Requirements

- Visual Studio Code `^1.120.0`
- GitHub Copilot access, or an OpenAI API key
- Optional: Graphify for relationship-aware repository context

## License

PromptIR is open source under the MIT License.

Brought to you by [ToolsDigger](http://toolsdigger.com).
