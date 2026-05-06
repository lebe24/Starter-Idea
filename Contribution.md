# Contribution Guide

Thank you for contributing to `saas-ideas`.

This guide explains how to set up your branch, submit changes, and keep pull requests easy to review.

## Development workflow

1. Fork or clone the repository.
2. Create a feature branch from `main`.
3. Make focused changes for one concern at a time.
4. Run lint and relevant local checks.
5. Open a pull request with context and test notes.

## Branch naming

Use clear branch names, for example:

- `feat/idea-validation-scoring`
- `fix/chat-response-stream`
- `docs/readme-roadmap-update`

## Commit message guidance

Write concise, descriptive commit messages in imperative form:

- `Add Product Hunt token fallback handling`
- `Fix markdown rendering in chat bubble`
- `Update README roadmap milestones`

## Local quality checks

Run these before submitting a PR:

```bash
pnpm lint
pnpm test:agent-tooling
pnpm test:checkout-insights
pnpm test:overview-sources
```

If your change does not touch the related area, call that out in your PR notes.

## Pull request checklist

When opening a PR, include:

- What changed and why
- Screenshots/GIFs for UI updates
- How it was tested locally
- Any follow-up tasks or known limitations

Keep PRs small and reviewable when possible.

## Code style expectations

- Follow existing TypeScript and React patterns in `app/`, `components/`, and `lib/`.
- Reuse shared UI components from `components/ui/` before creating new ones.
- Prefer explicit, readable code over clever abstractions.
- Add comments only for non-obvious logic.

## Documentation updates

If behavior changes for users or contributors, update docs in the same PR:

- `README.md` for project-level guidance
- `Contribution.md` for contributor process updates

## Questions and discussion

If something is unclear, open an issue or start a draft PR early with notes so feedback can happen before implementation grows too large.
