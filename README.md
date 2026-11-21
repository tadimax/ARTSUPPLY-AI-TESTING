# Does a requirement-to-test checklist make AI-written tests catch more seeded faults?

COMP 3520 Research and Implementation Assignment. An executable experiment on AI test generation from specifications alone.

**Research question.** Does a structured requirement-to-test checklist make AI-written tests, written from a specification alone without seeing the code, catch more seeded faults than a plain "write tests for this spec" prompt?

Headline results are in [results/summary.md](results/summary.md). The data is small (9 specs, 3 trials per cell, one model), so the results describe this experiment and are not a significance claim.

## Requirements

- Node.js 22 or newer (uses the built-in `node --test` runner).
- No npm dependencies, no install step, no network access, no credentials.

## Reproduce the results

```
node scripts/run_experiment.js
node scripts/analyze.js
```

The first command runs every test file under `generated/` and `human/`. It runs each file against the unmodified code. It then runs the file against each of the 73 seeded faults. It writes `results/runs.jsonl` and `results/faults_status.json`.

The second command reads those files. It rewrites `results/summary.md`. The same two commands run in CI (`.github/workflows/experiment.yml`).

Test files are never edited. The runner copies `sut/` to a temporary directory and applies one fault. Each test file runs from its original relative path. This is why `require("../../../sut/<module>")` resolves in the copy.

### What reproduction covers

These steps replay the evaluation of the stored test files. Everything after generation is deterministic. Running the stored files against the code and the faults gives the same results each time. Compare `results/summary.md` with the paper's tables to check.

These steps do not regenerate the tests. The 54 files in `generated/` were written by Claude Sonnet subagents. A language model can give a different answer to the same prompt on each run. Model versions also change over time. A second generation run would produce different files and different numbers. The stored files are kept exactly as produced.

No script in this repo starts the generation runs. They were started by hand as subagents in Claude Code. The prompts are in `prompts/` and the specs are in `specs/`, so the inputs are recorded. The outputs of a new run would not match.

An isolated, scripted generation step is listed as future work in the paper. It would send each prompt to the model API with no file-access tools.

## Layout

| Path | Contents |
|---|---|
| `specs/S1..S9` | Nine plain-language specifications. The only thing the test writer saw. |
| `prompts/basic.md`, `prompts/structured.md` | The two prompt templates. Identical except for the checklist. |
| `generated/<spec>/<basic or structured>/trial1..3.test.js` | 54 AI-written test files, written verbatim by subagents and never edited. |
| `corrected/` | Reserved for manual corrections. None were made. Any would count as failures in the main results. |
| `human/S9/human/trial1.test.js` | ArtSupply's own hand-written tests for S9 (ticket tiers), only the require path changed. |
| `sut/` | The code under test: `moneyMath.js`, `buyerPrice.js`, `ticketTiers.js`. |
| `faults/faults.js` | 73 hand-seeded faults, each a single find and replace on one file in `sut/`. |
| `scripts/run_experiment.js` | Runs all test files against correct code and each fault. |
| `scripts/analyze.js` | Produces `results/summary.md`. |
| `results/runs.jsonl` | Raw per-file results. |
| `results/faults_status.json` | Per-fault status, including whether any file killed it. |
| `results/generation_log.jsonl` | One line per generated file: spec, condition, trial, mtime, agent self-report. |
| `results/summary.md` | Aggregated results. |
| `scripts/audit_isolation.js` | Static check of the 54 generated files for signs the writer used information outside its spec. Run with `node scripts/audit_isolation.js`. |
| `results/isolation_audit.md` | Output of the isolation audit. It can find leakage but cannot prove isolation. |

## Definitions

- **Loaded**: the file runs at least one test on the correct code.
- **False alarm**: a test that fails on the correct code.
- **Killed**: a test that passes on the correct code fails on the faulty code. Tests that already fail on correct code never count as kills.
- **Possible equivalent mutant**: a fault no file ever kills. It is flagged and shown both with and without it in the adjusted rate. The runner refuses any fault whose find string is not unique in its file.

## Evaluation case sources

- **Code under test**: copied unchanged from the private ArtSupply repository at commit `e4a40e7071d7e71ba0c1a16bc4f1d7f8dc28c576`. Only these three pure modules are included. They contain no Stripe or Firebase configuration.
- **Specifications**: written for this study from ArtSupply's money rules (fees, refunds, chargebacks, debt recovery, points, ticket tiers).
- **Faults**: written by Claude from the specifications after reading the source, before any generated test was run.
- **Human baseline**: ArtSupply's `functions/test/ticketTiers.test.js`. It covers S9 only because the other human tests depend on modules that are not copied here.

## Method as executed

- 9 specs x 2 conditions x 3 trials = 54 generated files, from Claude Sonnet subagents (alias `sonnet`, same model for every run).
- Each agent was told to read only its spec. It had to write one file to a fixed path and not run it. It also had to report every file it opened. All 54 reported the spec only. This could not be technically enforced.
- S1 trial 1 in both conditions was run first as a pilot with the same prompts and kept as real data.

## Known limitations

See the paper for the full discussion. In brief: the specs and faults were written with knowledge of the code (contamination risk); faults were written by an AI and not by a mutation tool; the S7 structured trial 3 agent made more tool calls than the others and its transcript could not be inspected; the structured condition wrote about 2.4 times as many tests, so cost is a confound; the sample is small and covers one model, one domain and JavaScript only.

## AI use

Claude (Anthropic) was used to design the experiment. It wrote the specifications and the faults. It wrote the runner and the analysis scripts. It also generated the tests under study through subagents.

The researcher owns the research decisions, the review of the code and results, and the paper. Every reference in the paper must be read and verified by the researcher.
