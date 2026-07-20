# Contributing to qufox-docs

Thanks for your interest in improving qufox-docs! This guide covers the local
setup and the conventions the project follows.

## Development setup

qufox-docs uses [pnpm](https://pnpm.io) and targets Node.js >= 22.12.

```sh
pnpm install
pnpm build          # bundle the CLI and copy assets into dist/
node dist/cli.js serve fixtures/vault --open
```

### Scripts

| Script | Purpose |
| --- | --- |
| `pnpm build` | Bundle the engine and copy the design system + client assets. |
| `pnpm test` | Run the unit, integration, and end-to-end suites (Vitest). |
| `pnpm test:watch` | Run tests in watch mode. |
| `pnpm typecheck` | Type-check with `tsc --noEmit`. |
| `pnpm lint` | Lint and format-check with Biome. |
| `pnpm format` | Apply Biome fixes. |
| `pnpm sync:design [version]` | Refresh the vendored design system snapshot. |

Before opening a pull request, make sure the full gate is green:

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Testing

- **Unit** tests live in `tests/unit` — the Markdown pipeline snapshots in
  `tests/unit/__snapshots__` are the `qf-*` markup contract; review changes to
  them carefully.
- **Integration** tests in `tests/integration` boot the site against
  `fixtures/vault`.
- **End-to-end** tests in `tests/e2e` drive the built CLI as a real process.

The CI matrix runs on Ubuntu, macOS, and Windows because file watching and
unicode paths differ per platform. Please keep that portability in mind.

## Commits and pull requests

- Pull requests are **squash-merged**, so the **PR title becomes the commit**
  on `main`. Write it as a [Conventional Commit](https://www.conventionalcommits.org)
  (e.g. `feat(search): add filters`, `fix(build): handle empty vaults`).
- Add a [changeset](https://github.com/changesets/changesets) for any change
  that affects users: `pnpm changeset`, then commit the generated file. Choose
  the smallest version bump that fits.
- Keep changes focused and include tests for new behavior.

## Design system

The site markup must use the [qufox design system](https://design.qufox.com):
`qf-*` classes only, with color, spacing, and radius set through `var(--token)`
values — never raw hex, pixels, or shadows. If you need a component or token
that does not exist, open an issue so it can be requested upstream.
