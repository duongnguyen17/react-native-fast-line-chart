---
name: commit-message
description: Write or refine Conventional Commit messages for react-native-fast-line-chart, or create a local commit when the user asks to commit changes in this repository.
---

# Commit messages for react-native-fast-line-chart

Follow the style used in the related react-native-lunar-date-picker project and adapt to this repository's current history and commit checks.

1. Inspect `git status --short`, `git diff --cached`, and the relevant unstaged changes. Check recent commit subjects when useful. Identify the changes in scope and preserve unrelated staged and unstaged work.
2. Use an English subject in the form `<type>(<scope>): <description>`. The scope is optional: prefer `ios`, `android`, or `js` for changes limited to that layer; omit it for cross-platform work. Common types are `feat`, `fix`, `refactor`, `docs`, `test`, and `chore`. Use `release` for an actual release when compatible with the repository's commit checks.
3. Use a concise, imperative description, ordinarily lowercase except for identifiers and proper names, without emoji or a final period. Aim for a subject of at most 72 characters. For complex changes, add a blank line and a short body explaining the important changes or why they were needed.
4. If asked only to suggest a message, do not stage or commit. If asked to commit, include only the requested changes; inspect the staged diff before committing and do not silently include unrelated staged changes. Run checks appropriate to the change and report the commit subject and hash. Push only when the user also requests it.

Examples:

```text
fix(android): correct chart offset units
fix(ios): stop display link after single-point update
feat: support independent chart axis styling
chore: update nitro dependencies
release: 0.1.0
```
