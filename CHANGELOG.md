# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-07-23

### Changed
- First release published through the tag-driven trusted-publishing workflow (OIDC provenance). No library changes.

## [0.1.0] - 2026-07-23

### Added
- `detect()` — feature detection across the `prompt-api` → `webllm` → `wllama` lane chain, reporting the lane, model, and download size without downloading anything.
- `createSession()` / `session.prompt()` / `session.destroy()` — on-device sessions with per-lane structured output: `responseConstraint` (Prompt API), `response_format` JSON schema (WebLLM/XGrammar), and GBNF grammar sampling (wllama).
- `jsonSchemaToGbnf()` — JSON-schema-to-GBNF converter for the wllama lane; throws `PocketLlmError` on schema features outside its subset.
- Per-lane model overrides, consumer-supplied wllama wasm asset URLs (no hardcoded CDN), and lane forcing via `lanes`.
- Tag-driven npm release workflow using OIDC trusted publishing with provenance.

[Unreleased]: https://github.com/yasyf/pocket-llm/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/yasyf/pocket-llm/releases/tag/v0.1.1
[0.1.0]: https://github.com/yasyf/pocket-llm/releases/tag/v0.1.0
