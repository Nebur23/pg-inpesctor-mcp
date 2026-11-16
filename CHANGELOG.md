# Changelog

All notable user-facing changes are recorded here. Entries under `Unreleased` are not a claim that a package version has been published.

## Unreleased

### Changed

- Make `npx -y` optional in MCP host configuration examples, with troubleshooting guidance for hosts that need install confirmation.

## 0.1.2 - 2026-11-16

### Fixed

- Add a Node.js shebang to the stdio server entry point so npm-generated executable shims, including Windows `.cmd` shims, launch it with Node.
- Remove the Unix-only `chmod` step from the build script so `npm run build` works on Windows as well as Unix-like systems.

### Changed

- Expand installation documentation for local and global installs, MCP host configurations, and non-interactive `npx` usage.

## Previous history

Earlier release notes are not reconstructed without verified source history.
