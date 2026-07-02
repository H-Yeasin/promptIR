# PromptIR

PromptIR turns rough developer intent into context-aware, agent-ready prompts for modern coding assistants. It reads the active editor, optional selection, related workspace files, and VS Code diagnostics, then generates a focused prompt you can paste into Codex, Claude, Copilot, Gemini, or another agent.

The goal is simple: stop paying the context tax.

## Why PromptIR Exists

AI coding agents are powerful, but everyday development still often starts with vague commands like `fix this function`, `add error handling`, or `refactor this file`.

Those short prompts feel fast at first, but they create a hidden cost:

- Agents hallucinate APIs when they do not know the exact framework, version, or local conventions.
- They rewrite large blocks unnecessarily, wasting expensive LLM tokens and review time.
- Developers keep copying file paths, diagnostics, snippets, and terminal output between their IDE and chat.
- The first response often becomes a negotiation instead of a useful implementation.

PromptIR was built around one realization: coding agents are only as good as the constraints and workspace context they receive.

## The IR Idea

In compiler design, source code is not usually translated directly into machine code. It first becomes an Intermediate Representation: a structured form that can be analyzed, optimized, and transformed with precision.

PromptIR applies that same idea to developer intent:

1. **Human intent**: a short, messy command typed by the developer.
2. **PromptIR compiler**: gathers local repository context deterministically, applies boundaries, selects the right intent profile, and trims the payload.
3. **Agentic prompt**: a dense, explicit, token-aware instruction that gives the underlying LLM a much better first attempt.

Instead of treating prompting as a manual guessing game, PromptIR turns it into an automated intent-to-context pipeline inside VS Code.

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

## How It Works

PromptIR uses one unified engine behind every preset:

- Parse the developer's raw request and active workspace state.
- Gather relevant editor, selection, file, and diagnostics context.
- Choose an abstraction strategy for the selected intent profile.
- Remove noisy context before it reaches the model.
- Produce a precise prompt that tells the agent what to do, what not to touch, and how to verify the work.

Whether you are using **Refactor Safely**, **Review For Bugs**, or **Diagnose Build Failure**, the same architecture keeps the output focused, bounded, and practical.

## Roadmap

PromptIR is moving from prompt optimizer toward framework composer: a utility that can generate structured task profiles for different coding workflows while preserving the same deterministic context pipeline.

Planned directions include:

- Automatic terminal and test failure capture.
- Richer preset support in the Chat participant.
- More intent profiles for implementation, debugging, review, security, performance, and UI work.
- Smarter token budgeting for large workspaces.
- Better repository mapping so agents can operate with fewer follow-up questions.

## Requirements

PromptIR uses VS Code language model access through Copilot. You need an authorized Copilot language model available in VS Code.

## Extension Settings

This extension does not currently contribute settings.

## Known Issues

The Chat participant currently supports the optimize flow only. Preset support is available through the Composer.

## Release Notes

### 0.0.2

PromptIR Composer intent presets, diagnostics-aware prompts, pasted build failure diagnosis, workspace summaries, and focused review profiles.

### 0.0.1

Initial PromptIR Composer with context-aware prompt optimization and built-in intent presets.
