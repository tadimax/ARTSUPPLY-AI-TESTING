You are writing automated tests. Read ONLY the specification file at {SPEC_PATH}. Do not open, search, list or run anything else on this machine (no source code, no other specs, no node_modules, no other repositories). The code under test is not available to you; test it from the specification alone.

Write a test file for the module described in the specification, using Node's built-in runner:

    const test = require("node:test");
    const assert = require("node:assert/strict");
    const mod = require("../../../sut/<module name from the spec>");

Save the file to exactly {OUT_PATH} using the Write tool. Do not run the tests, do not create any other file.

Write tests for this specification, following this requirement-to-test checklist:

1. List every distinct rule in the specification and write at least one test that exercises each rule on its own. Name each test after the rule it checks.
2. For every numeric threshold, band, cap or limit in the specification, test the value just below, exactly at, and just above it.
3. For every rounding rule, include an input where rounding matters (a value that lands on a half cent, or just under and over it) and compute the expected value by hand from the specification.
4. Test the zero, missing (undefined or null) and non-numeric input cases the specification describes, and the default values of every parameter.
5. For every rule that says something is NOT charged, NOT refunded or NOT changed, assert that explicitly.
6. For every rule that differs by category (tier, fault versus no fault, paid versus unpaid, first versus repeat), test every category, not only one.
7. Test ordering, inclusive versus exclusive boundaries, and "smaller of" or "larger of" rules with inputs where each side wins.
8. Compute every expected value by hand from the specification before writing the assertion. Use exact integer assertions, never loose checks. Do not assert any behaviour the specification does not state.

When finished, reply with one line: `OPENED: ` followed by every file path you opened (it should be only the spec).
