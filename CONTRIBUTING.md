# Contributing

Thanks for helping improve A11y Virtual List. Keep changes focused, preserve the
public exports and baseline CSS contract, and avoid adding runtime dependencies
without prior maintainer agreement.

## Before Opening A Pull Request

1. Use Node.js 22.18 or newer and install dependencies with `npm ci`.
2. Add or update tests for behavior changes.
3. Run `npm run verify`.
4. If source or examples changed, confirm `git diff --exit-code -- docs` is
   clean after the build and commit the regenerated `docs/` output.
5. Add a Changeset with `npm run changeset` for user-visible changes. Do not edit
   package versions or release entries in `CHANGELOG.md` manually.

Describe the problem, the chosen approach, accessibility effects, and manual
checks in the pull request. Do not commit credentials, private data, local
editor settings, dependency folders, test recordings, or generated tarballs.

For a suspected vulnerability, follow [SECURITY.md](SECURITY.md) instead of
opening a public issue with exploit details.
