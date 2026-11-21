"use strict";

// Runs every test file under generated/ and human/ against (a) the unmodified code and (b) each seeded fault
// of the file's specification. No dependencies. Usage: node scripts/run_experiment.js
//
// A test file's layout is <root>/<spec>/<condition>/trial<k>.test.js and it requires "../../../sut/<module>".
// For each run we build a temporary tree  tmp/sut (mutated copy)  +  tmp/generated/<spec>/<condition>/<file>
// so the generated file is executed exactly as written, never edited.
//
// Definitions (all computed from per-test results, not from any AI judgement):
//   loaded        the file ran at least one test on the correct code (compiles, requires resolve)
//   falseAlarm    a test that FAILS on the correct code (the test asserts something the spec/impl does not do)
//   killed(f)     at least one test that PASSES on the correct code FAILS on fault f
//                 (tests that already fail on correct code never count as kills)

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const SUT = path.join(ROOT, "sut");
const faults = require(path.join(ROOT, "faults", "faults.js"));
const TIMEOUT_MS = 30000;

function listTests() {
  const out = [];
  for (const base of ["generated", "human"]) {
    const dir = path.join(ROOT, base);
    if (!fs.existsSync(dir)) continue;
    for (const spec of fs.readdirSync(dir)) {
      const sd = path.join(dir, spec);
      if (!fs.statSync(sd).isDirectory()) continue;
      for (const cond of fs.readdirSync(sd)) {
        const cd = path.join(sd, cond);
        if (!fs.statSync(cd).isDirectory()) continue;
        for (const f of fs.readdirSync(cd)) {
          if (!f.endsWith(".test.js")) continue;
          out.push({ spec, condition: cond, trial: f.replace(".test.js", ""), file: path.join(cd, f), base });
        }
      }
    }
  }
  return out.sort((a, b) => (a.spec + a.condition + a.trial).localeCompare(b.spec + b.condition + b.trial));
}

function parseTap(stdout) {
  // top-level results only: lines starting at column 0
  const tests = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = /^(not )?ok (\d+) - (.*?)(?: # .*)?$/.exec(line);
    if (m) tests.push({ n: Number(m[2]), name: m[3], pass: !m[1] });
  }
  return tests;
}

function runOnce(testFile, spec, cond, mutate) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aitest-"));
  try {
    fs.cpSync(SUT, path.join(tmp, "sut"), { recursive: true });
    if (mutate) {
      const p = path.join(tmp, "sut", mutate.file);
      const src = fs.readFileSync(p, "utf8");
      const mutated = src.replace(mutate.find, () => mutate.replace);
      fs.writeFileSync(p, mutated);
    }
    const dir = path.join(tmp, "generated", spec, cond);
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, path.basename(testFile));
    fs.copyFileSync(testFile, dest);
    const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", dest], {
      cwd: tmp, encoding: "utf8", timeout: TIMEOUT_MS,
    });
    return { tests: parseTap(r.stdout || ""), timedOut: !!r.error && r.error.code === "ETIMEDOUT", status: r.status };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function validateFaults() {
  const problems = [];
  for (const f of faults) {
    const src = fs.readFileSync(path.join(SUT, f.file), "utf8");
    const count = src.split(f.find).length - 1;
    if (count !== 1) problems.push(`${f.id}: find string occurs ${count} times (need exactly 1)`);
    if (f.find === f.replace) problems.push(`${f.id}: replacement equals find`);
  }
  return problems;
}

function main() {
  const problems = validateFaults();
  if (problems.length) {
    console.error("Fault definitions invalid:\n" + problems.join("\n"));
    process.exit(1);
  }
  fs.mkdirSync(path.join(ROOT, "results"), { recursive: true });
  const files = listTests();
  const rows = [];
  const killedBy = {}; // fault id -> [file labels]
  for (const f of faults) killedBy[f.id] = [];

  for (const t of files) {
    const specFaults = faults.filter((x) => x.spec === t.spec);
    const correct = runOnce(t.file, t.spec, t.condition, null);
    const loaded = correct.tests.length > 0;
    const passNames = new Map(correct.tests.filter((x) => x.pass).map((x) => [x.n, x.name]));
    const row = {
      spec: t.spec, condition: t.condition, trial: t.trial, source: t.base,
      loaded, testsTotal: correct.tests.length,
      testsPassOnCorrect: passNames.size,
      falseAlarms: correct.tests.length - passNames.size,
      falseAlarmNames: correct.tests.filter((x) => !x.pass).map((x) => x.name),
      faultsTotal: specFaults.length, killed: [], survived: [], faultRunErrors: [],
    };
    if (loaded) {
      for (const f of specFaults) {
        const m = runOnce(t.file, t.spec, t.condition, f);
        if (m.timedOut) { row.faultRunErrors.push(f.id + ":timeout"); continue; }
        const failedNow = new Set(m.tests.filter((x) => !x.pass).map((x) => x.n));
        const kill = [...passNames.keys()].some((n) => failedNow.has(n));
        // a mutant that stops the file from loading at all is recorded as an error, not as a kill
        if (m.tests.length === 0) { row.faultRunErrors.push(f.id + ":no-tests-ran"); continue; }
        if (kill) { row.killed.push(f.id); killedBy[f.id].push(`${t.condition}/${t.spec}/${t.trial}/${t.base}`); }
        else row.survived.push(f.id);
      }
    }
    row.killRate = specFaults.length ? row.killed.length / specFaults.length : null;
    rows.push(row);
    console.log(`${t.spec} ${t.condition} ${t.trial} [${t.base}] loaded=${loaded} tests=${row.testsTotal} falseAlarms=${row.falseAlarms} killed=${row.killed.length}/${specFaults.length}`);
  }

  fs.writeFileSync(path.join(ROOT, "results", "runs.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

  const faultRows = faults.map((f) => ({
    id: f.id, spec: f.spec, file: f.file, desc: f.desc,
    killedByCount: killedBy[f.id].length,
    killedByAnyFile: killedBy[f.id].length > 0,
    potentiallyEquivalent: killedBy[f.id].length === 0,
  }));
  fs.writeFileSync(path.join(ROOT, "results", "faults_status.json"), JSON.stringify(faultRows, null, 2) + "\n");
  console.log(`\nWrote results/runs.jsonl (${rows.length} test files) and results/faults_status.json`);
}

main();
