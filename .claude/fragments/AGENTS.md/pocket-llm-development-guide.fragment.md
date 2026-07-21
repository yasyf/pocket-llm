# pocket-llm Development Guide

On-device LLM sessions for any browser — Chrome's Prompt API, WebLLM, or wllama, picked by feature detection, smallest model first.

Run with [bun](https://bun.sh): `bun start`. No build step — bun executes TypeScript directly.

## Repository Structure

```
pocket-llm/
├── src/              # TypeScript source — entry point (index.ts) and modules
├── tests/            # bun test suite (bun:test)
├── .github/          # CI — typecheck + tests on bun
├── package.json      # scripts, dependencies, bun metadata
├── tsconfig.json     # strict TypeScript config (no emit — bun runs .ts directly)
├── AGENTS.md         # This file — shared conventions
└── README.md         # Project overview
```
