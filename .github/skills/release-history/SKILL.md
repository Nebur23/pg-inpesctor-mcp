---
name: release-history
description: Maintain this project's npm release history and choose semantic versions. Use when adding user-visible features/fixes, preparing a release, changing package versions, or recording a published release.
---

# Release history and versioning

Maintain [`CHANGELOG.md`](../../../CHANGELOG.md) as the human-readable history of user-visible features and changes. Before preparing a release, read the current package version, changelog, and recent Git history so the release notes reflect actual changes rather than guesses.

## Keep the changelog useful

- Add each user-visible change to the top-level `Unreleased` section as work is completed.
- Group entries under `Added`, `Changed`, `Fixed`, `Removed`, or `Security` only where appropriate. Describe effects for users, not internal implementation trivia.
- Do not list secrets, credentials, or unrelated refactors as product features.
- Do not claim a version was published until `npm publish` succeeded and the registry confirms that exact version.
- After successful publication, move the finalized notes into a dated version heading and create a fresh `Unreleased` section. If a release was not published, keep it under `Unreleased`.
- Never erase earlier release notes. Do not invent dates, features, or publication status for older versions; when history is unavailable, state that explicitly.

## Choose the version by SemVer

For this pre-1.0 package, use the conventional SemVer intent consistently and be conservative:

- **Patch** (`0.1.x`): backward-compatible bug fixes, packaging/build fixes, and documentation-only corrections.
- **Minor** (`0.x.0`): new backward-compatible features or capabilities.
- **Major** (`x.0.0`): breaking public API, configuration, tool behavior, or compatibility changes. At `0.y.z`, changes can still be breaking; explain them and choose a new minor version rather than treating them as a patch.

For a stable `1.0.0+` package, use standard SemVer: patch for compatible fixes, minor for compatible features, and major for breaking changes. Use prerelease identifiers only when deliberately publishing a test channel.

Before bumping, compare the proposed change against all user-facing behavior and configuration, not just the changed files. If the impact is ambiguous, ask the maintainer rather than silently selecting a version.

Use `npm version patch`, `npm version minor`, or `npm version major` to update package metadata and the lockfile together. Review the resulting diff; `npm version` may also create a Git tag, so use `--no-git-tag-version` when a tag is not intended. Never publish over an existing version.

## Release sequence

1. Update `Unreleased` in `CHANGELOG.md`.
2. Select and bump the SemVer version; check `package.json` and `package-lock.json` agree.
3. Follow the [`npm-release` skill](../npm-release/SKILL.md) to build, pack, inspect, install, and exercise the packed artifact.
4. Obtain explicit approval before publishing.
5. After publish succeeds, verify the version from the npm registry and finalize the corresponding dated changelog entry. If publication fails, leave it unreleased and investigate before retrying.
