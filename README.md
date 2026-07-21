# ![pocket-llm](docs/assets/readme-banner.webp)

**On-device LLM sessions for any browser.** pocket-llm feature-detects the fastest engine the browser can run, from Chrome's built-in Prompt API to WebLLM on WebGPU to wllama on CPU WASM, and defaults to the smallest model each engine supports.

[![CI](https://img.shields.io/github/actions/workflow/status/yasyf/pocket-llm/ci.yml?branch=main&label=ci)](https://github.com/yasyf/pocket-llm/actions/workflows/ci.yml)
[![License: PolyForm-Noncommercial-1.0.0](https://img.shields.io/badge/License-PolyForm--Noncommercial--1.0.0-blue.svg)](https://github.com/yasyf/pocket-llm/blob/main/LICENSE)

## Get started

```bash
git clone https://github.com/yasyf/pocket-llm
cd pocket-llm
bun install
bun start
```

```text
$ bun start
Hello, world! This is pocket-llm.
```

Driving with an agent? Paste this:

```text
Clone https://github.com/yasyf/pocket-llm, run `bun install && bun test`, then read
AGENTS.md and src/ to see where the engine lanes stand before changing anything.
```

---

## Use cases

pocket-llm exposes one API. `detect()` learns which engine this browser gets and what a download would cost; `createSession()` and `session.prompt()` produce schema-constrained completions. Three engines back it:

### Use the model the browser already ships

Chrome 138+ carries Gemini Nano behind the stable Prompt API. When `LanguageModel` is present, sessions ride it directly: no download beyond what Chrome manages itself, and structured output is enforced with the API's own `responseConstraint`.

### Use the GPU when the browser has one to offer

A browser without a built-in model but with WebGPU gets WebLLM, defaulting to the smallest model in its catalog, SmolLM2-135M-Instruct at ~270MB, fetched once and cached. Structured output rides `response_format` JSON schema via XGrammar.

### Fall back to CPU WASM everywhere else

A browser with neither the Prompt API nor WebGPU, which today means Safari and Firefox, gets wllama: llama.cpp compiled to single-threaded WASM, defaulting to SmolLM2-135M-Instruct GGUF Q4_K_M at ~105MB. It needs no COOP/COEP headers, so static hosts like GitHub Pages qualify. llama.cpp's grammar sampling keeps output on schema.

Downloads never start on their own: `detect()` reports the lane, the model, and the byte cost first, and the consumer decides.

Status: pre-release. The scaffold is live; the engine lanes and the first npm release land next.

Licensed under [PolyForm-Noncommercial-1.0.0](LICENSE).
