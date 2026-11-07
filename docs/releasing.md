# Releasing

This project publishes deliberately from `.github/workflows/publish.yml`. A
push to `main` does not publish a package.

The public package is `open-eraser` on npm.

During the migration away from private packages, each release is also published
to GitHub Packages as `@conellabs/open-eraser`. Some existing installations map
the whole `@conellabs` scope to GitHub Packages, so removing that copy
immediately would break their updates. Stop dual publishing only after those
installations have moved to `open-eraser` on the public registry.

## One-time repository setup

Before the first public release:

1. Make the GitHub repository public.
2. Confirm that the maintainers can publish `open-eraser` on npm.
3. Bootstrap the new npm package from an authenticated maintainer machine.
   Trusted publishing cannot be configured until the package exists. With a
   current npm CLI, prefer `npm stage publish --access public`, then approve or
   discard the staged bootstrap according to npm's instructions.
4. Create a GitHub environment named `npm`.
5. In npm package settings, configure GitHub Actions trusted publishing for:
   - Repository: `conellabs/OpenEraser`
   - Workflow: `publish.yml`
   - Environment: `npm`
6. Enable GitHub private vulnerability reporting.
7. Protect `main` and require the CI checks.

If the repository, package, or organization is renamed, update all trusted
publisher and package metadata settings before release.

## Release checklist

1. Update `package.json` through the project’s chosen versioning process.
2. Run:

   ```bash
   pnpm install --frozen-lockfile
   pnpm test
   pnpm typecheck
   pnpm build
   pnpm check:package
   ```

3. Confirm `git status` contains only intended source changes.
4. Merge the release commit to `main`.
5. Create a GitHub release for the matching tag, for example `v0.1.0`.
6. The publish workflow checks both registries, publishes to npm with
   provenance, and publishes a compatibility copy to GitHub Packages.
7. Install the public npm package from a clean project with no Conella registry
   mapping and render one fixture.
8. Verify that an existing GitHub Packages setup can resolve the same version.

The workflow can also be started manually, but it always publishes the version
currently present in `package.json` and skips an existing version.

## Renaming

If the project is ever renamed, update:

- GitHub repository and links
- npm package and trusted publisher
- package exports used in examples
- browser global name
- generated artifact footer
- documentation and badges
