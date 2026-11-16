# Changelog

All notable user-facing changes are recorded here. Entries under `Unreleased` are not a claim that a package version has been published.

## Unreleased

### Fixed

- Add a Node.js shebang to the stdio server entry point so npm-generated executable shims, including Windows `.cmd` shims, launch it with Node.
- Remove the Unix-only `chmod` step from the build script so `npm run build` works on Windows as well as Unix-like systems.

### Changed

- Document the non-interactive `npx -y` stdio configuration and release artifact testing workflow.

## Previous history

This changelog starts with the current 0.1.1 release candidate. Earlier release notes are not reconstructed without verified source history.
