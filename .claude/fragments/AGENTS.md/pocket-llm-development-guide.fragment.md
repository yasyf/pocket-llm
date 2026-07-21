# pocket-llm Development Guide

On-device LLM sessions for any browser — Chrome's Prompt API, WebLLM, or wllama, picked by feature detection, smallest model first.

A library package on the [bun](https://bun.sh) toolchain: `bun test` runs the suite, `bun run typecheck` checks, `bun run build` emits `dist/` via `tsc -p tsconfig.build.json`. There is no runtime CLI.

## Repository Structure

```
pocket-llm/
├── src/                  # The library — index.ts barrel; detect, session, chain, gbnf, types
│   └── lanes/            # One module per engine lane: prompt-api, webllm, wllama (lazy-imported)
├── tests/                # bun:test suite — stubbed-global lane selection, schema plumbing, GBNF
├── dist/                 # Build output (gitignored) — the tsc emit npm ships
├── .github/              # CI (typecheck, test, build) + tag-driven npm trusted-publishing release
├── package.json          # Publish surface: ESM exports map, files=["dist"]
├── tsconfig.json         # Strict check config (noEmit); tsconfig.build.json emits
├── AGENTS.md             # This file — shared conventions
└── README.md             # Project overview
```
