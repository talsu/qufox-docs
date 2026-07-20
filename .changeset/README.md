# Changesets

This folder holds [changesets](https://github.com/changesets/changesets): a
changeset is a small Markdown file describing a change and the version bump it
warrants. Add one for any user-facing change:

```sh
pnpm changeset
```

Merging the automated **Version Packages** pull request consumes the pending
changesets, updates `CHANGELOG.md`, bumps the version, and publishes the release.
