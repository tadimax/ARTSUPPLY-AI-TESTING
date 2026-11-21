You are writing automated tests. Read ONLY the specification file at {SPEC_PATH}. Do not open, search, list or run anything else on this machine (no source code, no other specs, no node_modules, no other repositories). The code under test is not available to you; test it from the specification alone.

Write a test file for the module described in the specification, using Node's built-in runner:

    const test = require("node:test");
    const assert = require("node:assert/strict");
    const mod = require("../../../sut/<module name from the spec>");

Save the file to exactly {OUT_PATH} using the Write tool. Do not run the tests, do not create any other file.

Write tests for this specification.

When finished, reply with one line: `OPENED: ` followed by every file path you opened (it should be only the spec).
