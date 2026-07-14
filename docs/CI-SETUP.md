# Enabling CI

`docs/github-actions-ci.yml` runs typecheck, lint, unit tests and a build on every
push/PR. It is not yet installed because pushing to `.github/workflows/` requires
the `workflow` OAuth scope, which the current GitHub token does not have.

To enable it, either:

1. Grant the scope, then move the file into place:

       gh auth refresh -s workflow
       mkdir -p .github/workflows
       cp docs/github-actions-ci.yml .github/workflows/ci.yml
       git add .github/workflows/ci.yml && git commit -m "Add CI" && git push

2. Or paste the contents of `docs/github-actions-ci.yml` into GitHub:
   **Actions → New workflow → set up a workflow yourself**, name it `ci.yml`, commit.
