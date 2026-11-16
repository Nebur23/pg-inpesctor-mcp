---
name: npm-release
description: Prepare and verify Node.js/TypeScript npm packages before release. Use when changing package entry points, build scripts, npm metadata, packaging, testing an installable artifact, or preparing/publishing a release.
---

# npm release readiness

Use this workflow for every npm release, especially changes to build output, package entry points, CLI/MCP launchers, dependencies, or the `files` allowlist. Do not publish until the packed artifact has been tested. Publishing is an irreversible external action; obtain explicit user approval before running `npm publish`.

## 1. Inspect the package before changing it

- Read `package.json`, the lockfile, `tsconfig.json`, source entry points, and relevant build/test scripts.
- Verify `name`, `version`, `type`, `main`/`exports` (if present), every `bin` mapping, and the `files` allowlist.
- Ensure every published executable has a Node shebang (`#!/usr/bin/env node`) in its source so TypeScript preserves it. A direct `node dist/file.js` test does not prove that npm-generated `bin` shims work.
- Check that emitted ESM relative imports resolve within the packed `dist` tree. Use explicit `.js` extensions in TypeScript ESM source imports where required.
- Keep build/test commands portable across supported operating systems. Avoid Unix-only commands such as `chmod` in scripts expected to run on Windows; use npm's bin shim behavior and shebangs.
- Keep `package.json` and `package-lock.json` versions and package metadata in sync.
- Do not broaden the release scope or change runtime/business behavior as part of packaging fixes.

## 2. Build and inspect the package contents

From the repository root:

```sh
npm ci
npm run build
npm test
npm pack --dry-run
npm pack
```

Run the relevant smaller checks too when available (for example, a TypeScript build). The integration test may require Docker; report that limitation rather than implying it passed.

Inspect the tarball, not just the working tree:

```sh
npm pack --json
tar -tf neb23x-pg-inspector-mcp-<version>.tgz
```

Confirm that the package includes all runtime files referenced by `main`, `exports`, and `bin`, plus runtime assets, and excludes development-only or sensitive files. Extract it to a new temporary directory and inspect the emitted entry points and their relative imports. Do not rely on the ignored local `dist` directory alone.

## 3. Simulate installation and launch from the packed artifact

`npm pack` followed by installing the tarball is the preferred pre-publish test: it exercises npm's packlist, dependency installation, and generated executable shims. `npm link` is useful for quick iteration but creates a symlink to the working tree; it does not prove the tarball contains all required files and must not replace the tarball test.

Install the tarball into a clean temporary prefix, then invoke the installed binary and speak the real protocol over stdin/stdout. For an MCP server, send `initialize`, `notifications/initialized`, `tools/list`, and a harmless tool such as `ping`. Assert successful responses, exit status, and that stdout contains only protocol messages (diagnostics belong on stderr).

Also test the npx entry point using the local tarball, not the registry's `latest`:

```sh
npx --yes --package ./neb23x-pg-inspector-mcp-<version>.tgz pg-inspector-server
```

Pipe a saved MCP request fixture to the command and assert initialization and tool responses. On Windows, run through `npx.cmd`/the generated `.cmd` shim as well as direct Node execution; the shim is the path the MCP host uses. Use a disposable npm cache for cold-cache testing when network access is available. If dependency or registry access times out, state that the cold-cache result is inconclusive; do not mistake it for a package startup failure.

Test from a clean working directory so the project root's `node_modules` or untracked build output cannot hide missing package files. Verify a meaningful server response, not merely that the process stayed alive or printed a startup banner.

## 4. Verify the user's actual launch configuration

For stdio MCP clients, the npx package install must not wait for an interactive prompt. Use `-y`/`--yes` in the host's argument list:

```json
{
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "-p", "@scope/package@latest", "server-command"]
}
```

`-y` suppresses npx's package-install confirmation; it does not suppress server errors or protocol messages. Keep the executable name consistent with the `bin` key in `package.json`. Test the same argument sequence in a disposable host config before release when possible.

## 5. Release only after checks pass

- Review the exact files included by `npm pack`, test results, `git diff`, and the changelog.
- Verify the intended version and that it is not already published. Never overwrite/reuse an npm version; prepare a new version if a release attempt already consumed it.
- Publish only with explicit user approval. After publishing, verify the registry version and package contents, then mark the changelog entry as released.
- If any required check fails or is inconclusive, stop before publishing and report precisely what remains unverified.
