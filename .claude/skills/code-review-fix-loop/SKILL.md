---
name: code-review-fix-loop
description: Run the review-fix-ship cycle after a code review. Use right after /code-review output, or whenever the user says "fix", "default", or "fix those" after a review. Triages findings, fixes the real ones with minimal changes, lints only changed files, commits and pushes to the existing PR branch, then watches PR checks. Use it even if the user does not name the skill.
---

# Code Review Fix Loop

Turns a review's findings into a pushed fix and a green PR with as little back-and-forth as possible. Reviews are cheap to run and easy to over-act on, so the first job is separating real defects from noise.

## 1. Triage every finding

Label each as one of:

- **fix**: a verifiable defect in the code as written.
- **skip**: speculative. Examples: unverified library behavior, dev-only races (e.g. React StrictMode double-invocation), tuning or style preferences. Give one line of reason.
- **contradicts earlier round**: reverses something fixed or deliberately accepted before. Skip it and say which round it conflicts with.

Never re-raise a skip the user already accepted. Re-litigating settled calls wastes rounds and erodes trust in the loop.

## 2. Fix

Make the smallest change that resolves each finding. Group findings that share a root cause into one change. Do not refactor beyond the finding.

## 3. Lint

Lint only the files you changed. If the repo has unrelated lint errors elsewhere, mention them in one clause and leave them alone. Fixing them bloats the PR and muddies review.

## 4. Commit and push

- Commit with the session's attribution lines.
- Push to the existing PR branch.
- If no PR exists, open a draft PR and subscribe to its notifications.
- Never force-push. Rewriting history breaks the reviewer's view of earlier rounds.

## 5. Watch the PR

Read PR notifications. A passing check suite plus a Ready preview means done. Ignore bot comments that only echo status. A red check is work now: fix it before reporting.

## 6. Report

Keep it short:

1. Fixed (what, per finding)
2. Skipped, with the one-line reason each
3. One line on what waits on the user

## Stop rule

After about three rounds, or when findings turn narrow or start contradicting each other, stop recommending another review. Recommend a real-device or manual test instead. Late-round findings are usually diminishing returns, and only real use will surface what the reviewer cannot.
