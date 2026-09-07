# Contributing to Zoe

Zoe is a terminal engineering assistant built as a small npm workspace. The CLI lives in `packages/cli`, and provider, indexing, tool, and session logic lives in `packages/core`.

## Development setup

Install Node.js 20 or newer, then run:

```bash
npm ci
npm run build
npm test
```

Start the built CLI from a project you want Zoe to inspect:

```bash
npm start
```

For a global development command, link the CLI workspace:

```bash
npm link --workspace=zoe
```

## Before opening a pull request

Run the same checks as CI:

```bash
npm run typecheck
npm test
npm run build
```

Keep changes focused, add tests for behavior that can regress, and update the README when commands, configuration, or user-facing behavior changes.

Zoe is distributed under the Apache License 2.0. By contributing, you agree that your contribution may be distributed under that license.
