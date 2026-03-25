# Contributing

## Commit Standard

Use Conventional Commits:

```text
type(scope): short description
```

- Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`
- Common scopes: `cdk`, `examples`, `test`, `docs`, `go`
- Keep the subject imperative, under 72 characters, and without a trailing period
- Do not add AI attribution lines

## Branching

- `main` is the stable branch
- `dev` is the shared integration and release-prep branch
- short-lived work should branch from `dev` when active work is already in progress

## Before You Commit

Run:

```bash
npm run verify
```

If you changed the Go wrapper target, also regenerate the wrapper output with:

```bash
npm run package:go
```

For coordinated cross-repo release prep, use:

```bash
python3 tools/prepare_workspace_release.py \
  --workspace-root <workspace-root> \
  --cdk-version <cdk-version> \
  --terraform-version <terraform-version>
```
