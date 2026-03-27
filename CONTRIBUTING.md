# Contributing

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): short description
```

| Rule | Detail |
|------|--------|
| Types | `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci` |
| Scopes | `cdk`, `examples`, `test`, `docs`, `go` |
| Subject | Imperative mood, under 72 chars, no trailing period |
| Granularity | One logical change per commit |

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Tagged releases |
| `dev` | Integration and release prep |
| `ci-cd` | Workflow and automation changes only |

Feature work branches from `dev` unless CI-only.

## Before You Commit

```bash
npm run verify
```

This compiles TypeScript, runs tests, and generates Go bindings.

If you changed the Go wrapper target, also regenerate:

```bash
npm run package:go
```

## Releases

Releases are cut from `main` by pushing a semver tag:

```bash
git tag v0.4.0
git push origin v0.4.0
```

`.github/workflows/release.yml` publishes the npm package and triggers the Go wrapper repo's release workflow. Cross-repo orchestration requires the `RELEASE_REPO_TOKEN` secret.

For coordinated multi-repo releases:

```bash
python3 tools/prepare_workspace_release.py \
  --workspace-root <path> \
  --cdk-version <version> \
  --terraform-version <version>
```
