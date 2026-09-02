# Module test-plan extractor and test-generation bridge

A small, deterministic AST analysis utility. Given a JavaScript source file it
produces a JSON description of what the module exposes and what is therefore
worth testing: exported functions and classes, their parameters, shallow
structural counts (branches, `return`, `throw`), `require`/`import`
dependencies, referenced free identifiers, and leading JSDoc.

On top of that plan sits a **generation layer** that turns a plan into a
structured, deterministic request and finally a prompt string for a future
test-generation provider:

```sh
source file
    -> AST extractor            (extract-module.js / module-test-plan.js)
    -> ModuleTestPlan            (JSON)
    -> generation request       (generation-request.js)
    -> deterministic prompt      (prompt-builder.js)
    -> provider                  (llm-client.js: NoopClient / ManualClient / ...)
    -> generated Jest test       (in-memory string)
```

The extractor reads and parses the analysed source but never executes it. The
generation layer does not read source files, write to the source tree, require a
credential, or make a network call. The only providers shipped are credential-free
(`noop`, `manual`); a real model-backed provider is left for a later change and
would be a new class in `llm-client.js` only.

## Usage

```sh
# Print the plan as JSON
node scripts/generate-tests/cli.js js/utils/utils-logic.js

# Compare against a committed expected plan without writing anything.
# Exit 0 on match, 1 on mismatch. The expected file defaults to the source
# path with `.js` replaced by `.plan.json`; an explicit path may be given.
node scripts/generate-tests/cli.js path/to/module.js --check
node scripts/generate-tests/cli.js path/to/module.js --check path/to/expected.json

# Print the deterministic test-generation prompt for a module.
node scripts/generate-tests/cli.js js/utils/utils-logic.js --prompt

# Run the generation pipeline through a credential-free provider and print the
# candidate test source (nothing is written to disk).
node scripts/generate-tests/cli.js js/utils/utils-logic.js --generate
node scripts/generate-tests/cli.js js/utils/utils-logic.js --generate=manual
```

`--check`, `--prompt` and `--generate` are mutually exclusive.

## Programmatic API

```js
const { extractFile } = require("./extract-module");
const { buildGenerationRequest } = require("./generation-request");
const { buildPrompt, buildPromptFromPlan } = require("./prompt-builder");
const { generateTests, createClient, NoopClient, ManualClient } = require("./llm-client");

const plan = extractFile("js/utils/utils-logic.js");
const prompt = buildPromptFromPlan(plan); // string, deterministic

// Full pipeline, defaulting to the NoopClient:
const { request, prompt: p, source, meta } = await generateTests(plan);

// Bring your own provider (any object with `name` and `generate(request)`):
await generateTests(plan, { client: myClient });
await generateTests(plan, { provider: "manual", clientOptions: { responses } });
```

## Files

| File                    | Responsibility                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `extract-module.js`     | Reads a file, parses it with the vendored Acorn (`lib/acorn.min.js`), returns a plan. |
| `module-test-plan.js`   | Pure AST walker that builds the plan structure.                                       |
| `generation-request.js` | Turns a plan into a structured `{ module, plan, instructions, ... }` request.         |
| `prompt-builder.js`     | Renders a request as one deterministic prompt string.                                 |
| `llm-client.js`         | Provider seam: `NoopClient`, `ManualClient`, `createClient`, `generateTests`.         |
| `cli.js`                | Command-line wrapper: `--check`, `--prompt`, `--generate`.                            |
| `__tests__/`            | Jest tests plus fixtures and their committed `.plan.json` plans.                      |

## Generation layer

- **`buildGenerationRequest(plan, options)`** produces a plain object holding a
  normalized copy of the plan, a module summary, and three fixed lists:
  `instructions` (what to generate), `testRequirements` (shape of the tests) and
  `conventions` (how this repo writes tests). A partial or hand-written plan is
  tolerated - missing lists become empty. Each list can be overridden through
  `options`.
- **`buildPrompt(request)`** is pure text formatting. Every list it prints is
  already sorted by the extractor, so the same request always yields the same
  string (ending in a single newline).
- **Providers** are any object exposing `name` and
  `generate(request) -> { source, meta }` (sync or async). `NoopClient` returns
  a syntactically valid Jest skeleton (`it.todo` per export, parse-checked in
  the tests); `ManualClient` returns a
  pre-registered response or the prompt wrapped in a comment. `createClient`
  throws a clear error for a named-but-unimplemented provider (`openai`, ...).
- The prompt instructs a generator to test **observable behaviour** through the
  public API, not to emit a test per AST node, not to mock the module under
  test, and never to emit code that writes to disk.

## Applying the plan to utility coverage

The extractor is generic, but its first practical use is bounded to the pure
utility modules under `js/utils/` (plus `js/base64Utils.js`). The plan is read
as a checklist, not as a test generator:

1. `node scripts/generate-tests/cli.js <module>` lists every export with its
   parameter list and branch / `return` / `throw` counts.
2. Cross-reference that list against the module's existing
   `__tests__/*.test.js` — exports with no `describe` block, and functions
   whose branch count far exceeds what the suite exercises, are the gaps.
3. Fill the gaps with behaviour assertions (valid / invalid / boundary / empty
   inputs, round trips, deterministic tables, documented error paths), never a
   test written only to move a line.
4. Re-measure focused Jest coverage and, where the run is bounded enough to be
   practical, Stryker (`npx stryker run --mutate "<module>"`).

Worked examples from this pass:

| Module              | Plan finding                                                                                                             | Tests added                                                                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils-logic.js`    | `LCD` exported but untested; `oneHundredToFraction` has 101 branches, the suite hit ~12                                  | exhaustive 1–99 fraction table + monotonicity/tolerance properties, `LCD`/`GCD` invariants, `rationalSum` non-integer components, `mixedNumber` carry/precision edges, `rationalToFraction` collapse path, `resolveObject` throw path |
| `musicutils.js`     | `getEdoNoteNamePosition`, `temperamentHasRatios`, `isTrueEDO`, `isEquallyTempered` exported with no dedicated `describe` | EDO name-table lookup with its three fallbacks; temperament predicates pinned across the shipped temperament list                                                                                                                     |
| `base64Utils.js`    | only `decode(encode(x))` round trips — a symmetric bug would pass                                                        | known-answer encoder vectors + Base64-alphabet / padding invariants                                                                                                                                                                   |
| `language-utils.js` | normaliser had no idempotency or full-mapping check                                                                      | `normalize(normalize(x)) === normalize(x)`, every menu code → its locale                                                                                                                                                              |
| `mathutils.js`      | already ~99 % branch; remaining gap is the `module.exports` guard                                                        | none — inspected and left as-is                                                                                                                                                                                                       |

Two `utils-logic.js` branches are left uncovered on purpose: the non-browser
`unescapeHTML` fallback in `isSafeUrl` (jsdom always provides `DOMParser`) and
the `default` arm of `oneHundredToFraction` (its input is clamped to 1–99, so
every `Math.floor` value already has an explicit `case`).

## What is extracted

- **exports** – `module.exports = <object>` (directly or through one identifier)
  is expanded one level into its members; `exports.x = ...`, direct
  class/function assignment, and ES module `export` forms are also recognised.
  Each entry carries `name`, `kind` (`function` / `class` / `object` / `value`),
  and – for functions – `params` and `arity`, or – for classes – `methods` and
  `superClass`.
- **functions** / **classes** – every top-level declaration, with per-function
  branch / `return` / `throw` counts (not descending into nested functions) and
  per-class method descriptions (constructor, methods, accessors, `static`).
- **dependencies** – string arguments to `require(...)` and `import`/`export`
  sources.
- **referencedGlobals** – identifiers used in a value position that are not bound
  anywhere in the file.
- **jsdoc** – `/** ... */` blocks that sit directly above a declaration, split
  into a description and a flat list of `@tag` entries. A class member's `target`
  is qualified with the class name (`Counter.tick`); a bare `target` is a
  top-level function, class or variable.
- **totals** – whole-file branch / `return` / `throw` counts.

`branches` (per-function and in `totals`) is a rough syntactic count – `if`,
conditional expression, each `&&` / `||` / `??`, and each non-default `switch`
case. It is **not** cyclomatic complexity or branch coverage: `a && b && c`
counts as two and loops are not counted.

## Deliberate limitations

- Everything is derived syntactically. The target file is never required,
  imported, executed or written to.
- Parsing uses the vendored Acorn (8.14.1) with `ecmaVersion: 2020`, matching the
  rest of the repository. Syntax newer than that is a parse error.
- `referencedGlobals` is name-based, not scope-accurate: a name bound anywhere in
  the file is treated as bound everywhere, so a global shadowed elsewhere may be
  omitted. Dependency detection uses the same heuristic to ignore a locally
  declared `require`.
- CommonJS exports are detected only at module scope (including the usual
  `if (typeof module !== "undefined" ...)` guard). `module.exports = ...` inside
  a nested function is ignored. Conditional or computed exports are not resolved.
- Parse errors are reported with the filename attached and never modify anything.
